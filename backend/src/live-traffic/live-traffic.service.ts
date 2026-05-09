import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { classifyUserAgent } from './bot-classify';

export type LiveTrafficEvent = {
  at: string;
  ip: string;
  method: string;
  path: string;
  userAgent: string;
  isBot: boolean;
  botFamily: string | null;
};

export type LiveTrafficSnapshot = {
  windowSec: number;
  generatedAt: string;
  /** Уникальные IP за окно, не распознаны как роботы */
  uniqueHumanIps: number;
  /** Уникальные IP за окно, роботы */
  uniqueBotIps: number;
  /** Число записанных запросов за окно */
  totalHits: number;
  /** Доли поисковых роботов (семейства из классификации) за окно — по числу запросов */
  searchBotHitsByFamily: { family: string; hits: number }[];
  /** Последние события (новые сверху) */
  recent: LiveTrafficEvent[];
};

export type LiveTrafficHistoryRange = 'day' | 'week' | 'month' | '3m';

export type LiveTrafficHistoryPoint = {
  at: string;
  totalHits: number;
  humanHits: number;
  botHits: number;
  uniqueHumanIps: number;
  uniqueBotIps: number;
};

export type LiveTrafficHistory = {
  range: LiveTrafficHistoryRange;
  bucket: 'minute' | 'hour' | 'day';
  generatedAt: string;
  points: LiveTrafficHistoryPoint[];
};

export type LiveTrafficSummary = {
  range: LiveTrafficHistoryRange;
  generatedAt: string;
  totalHits: number;
  humanHits: number;
  botHits: number;
  humanSharePct: number;
  botSharePct: number;
};

export type LiveTrafficTopPathRow = {
  path: string;
  hits: number;
  humanHits: number;
  botHits: number;
};

export type LiveTrafficTopPaths = {
  range: LiveTrafficHistoryRange;
  generatedAt: string;
  limit: number;
  rows: LiveTrafficTopPathRow[];
};

const DEFAULT_WINDOW_SEC = 300;
const MAX_STORED = 2500;
const MAX_SNIPPET_UA = 200;
/** Хранить события дольше максимального окна снимка (3600 с), чтобы длинное окно в UI не было пустым. */
const RETAIN_EVENTS_MS = 7200 * 1000;
const FLUSH_EVERY_MS = 5000;
const CLEANUP_EVERY_MS = 60 * 60 * 1000;
const RETAIN_DAYS = 90;

const TRAFFIC_MIGRATION_HINT =
  'Таблица истории посетителей (AdminTrafficHit) не найдена. На сервере выполните: docker compose exec backend npx prisma migrate deploy';

function isMissingAdminTrafficTable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') return true;
  }
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('AdminTrafficHit') ||
    msg.includes('42P01') ||
    /relation\s+"AdminTrafficHit"\s+does\s+not\s+exist/i.test(msg)
  );
}

@Injectable()
export class LiveTrafficService {
  private readonly log = new Logger('LiveTraffic');
  private readonly events: { at: number; ip: string; method: string; path: string; ua: string }[] = [];
  private pendingDb: { ipHash: string; isBot: boolean; botFamily: string | null; method: string; path: string }[] =
    [];
  private flushInFlight: Promise<void> | null = null;

  /** Текущее окно наблюдения в секундах (для UI) */
  private windowSec = DEFAULT_WINDOW_SEC;

  constructor(private readonly prisma: PrismaService) {
    // Не блокируем запросы записи в БД — пишем батчами.
    setInterval(() => {
      void this.flushToDb();
    }, FLUSH_EVERY_MS);

    setInterval(() => {
      void this.cleanupOldHits();
    }, CLEANUP_EVERY_MS);
  }

  setWindowSec(sec: number) {
    const s = Math.min(Math.max(Number(sec) || DEFAULT_WINDOW_SEC, 30), 3600);
    this.windowSec = s;
  }

  getWindowSec(): number {
    return this.windowSec;
  }

  private ipHash(ip: string): string {
    const salt = process.env.TRAFFIC_HASH_SALT || 'vetconnect';
    return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
  }

  recordRequest(opts: { ip: string; method: string; path: string; userAgent?: string }): void {
    const now = Date.now();
    this.events.push({
      at: now,
      ip: opts.ip,
      method: opts.method,
      path: opts.path,
      ua: (opts.userAgent ?? '').slice(0, 4000),
    });
    if (this.events.length > MAX_STORED) {
      this.events.splice(0, this.events.length - MAX_STORED);
    }
    this.pruneOlderThan(now - RETAIN_EVENTS_MS);

    try {
      const c = classifyUserAgent(opts.userAgent ?? '');
      this.pendingDb.push({
        ipHash: this.ipHash(opts.ip),
        isBot: c.isBot,
        botFamily: c.botFamily,
        method: opts.method.slice(0, 16),
        path: opts.path.slice(0, 2048),
      });
      // При всплесках не копим слишком много.
      if (this.pendingDb.length > 2500) {
        this.pendingDb.splice(0, this.pendingDb.length - 2500);
      }
    } catch {
      /* не блокируем */
    }
  }

  private pruneOlderThan(ts: number) {
    while (this.events.length > 0 && this.events[0].at < ts) {
      this.events.shift();
    }
  }

  getSnapshot(windowSec = this.windowSec): LiveTrafficSnapshot {
    const now = Date.now();
    const winMs = Math.min(Math.max(windowSec, 30), 3600) * 1000;
    const from = now - winMs;
    this.pruneOlderThan(now - RETAIN_EVENTS_MS);

    const inWin = this.events.filter((e) => e.at >= from);
    const humanIps = new Set<string>();
    const botIps = new Set<string>();
    const searchFamilyHits = new Map<string, number>();

    for (const e of inWin) {
      const { isBot, botFamily } = classifyUserAgent(e.ua);
      if (isBot) {
        botIps.add(e.ip);
        const fam = botFamily ?? 'Робот';
        searchFamilyHits.set(fam, (searchFamilyHits.get(fam) ?? 0) + 1);
      } else {
        humanIps.add(e.ip);
      }
    }

    const searchBotHitsByFamily = [...searchFamilyHits.entries()]
      .map(([family, hits]) => ({ family, hits }))
      .sort((a, b) => b.hits - a.hits);

    const recent: LiveTrafficEvent[] = [...inWin]
      .sort((a, b) => b.at - a.at)
      .slice(0, 100)
      .map((e) => {
        const c = classifyUserAgent(e.ua);
        return {
          at: new Date(e.at).toISOString(),
          ip: e.ip,
          method: e.method,
          path: e.path,
          userAgent: e.ua.length > MAX_SNIPPET_UA ? `${e.ua.slice(0, MAX_SNIPPET_UA - 1)}…` : e.ua,
          isBot: c.isBot,
          botFamily: c.botFamily,
        };
      });

    return {
      windowSec: Math.floor(winMs / 1000),
      generatedAt: new Date(now).toISOString(),
      uniqueHumanIps: humanIps.size,
      uniqueBotIps: botIps.size,
      totalHits: inWin.length,
      searchBotHitsByFamily,
      recent,
    };
  }

  private async flushToDb(): Promise<void> {
    if (this.flushInFlight) return this.flushInFlight;
    if (this.pendingDb.length === 0) return;

    const batch = this.pendingDb.splice(0, Math.min(1200, this.pendingDb.length));
    const p = (async () => {
      try {
        await this.prisma.adminTrafficHit.createMany({
          data: batch.map((b) => ({
            ipHash: b.ipHash,
            isBot: b.isBot,
            botFamily: b.botFamily ?? undefined,
            method: b.method,
            path: b.path,
          })),
        });
      } catch (e: unknown) {
        this.log.warn(`flushToDb failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        this.flushInFlight = null;
      }
    })();
    this.flushInFlight = p;
    return p;
  }

  private async cleanupOldHits(): Promise<void> {
    const before = new Date(Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000);
    try {
      await this.prisma.adminTrafficHit.deleteMany({ where: { createdAt: { lt: before } } });
    } catch (e: unknown) {
      this.log.warn(`cleanupOldHits failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async getHistory(range: LiveTrafficHistoryRange): Promise<LiveTrafficHistory> {
    const now = new Date();
    const bucket: LiveTrafficHistory['bucket'] =
      range === 'day' ? 'minute' : range === 'week' ? 'hour' : 'day';

    const since = this.sinceForRange(now, range);

    const sql = `
      SELECT
        date_trunc('${bucket}', "createdAt") AS bucket,
        COUNT(*)::int AS "totalHits",
        COUNT(*) FILTER (WHERE "isBot" = false)::int AS "humanHits",
        COUNT(*) FILTER (WHERE "isBot" = true)::int AS "botHits",
        COUNT(DISTINCT "ipHash") FILTER (WHERE "isBot" = false)::int AS "uniqueHumanIps",
        COUNT(DISTINCT "ipHash") FILTER (WHERE "isBot" = true)::int AS "uniqueBotIps"
      FROM "AdminTrafficHit"
      WHERE "createdAt" >= $1
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    try {
      const rows = await this.prisma.$queryRawUnsafe<
        {
          bucket: Date;
          totalHits: number;
          humanHits: number;
          botHits: number;
          uniqueHumanIps: number;
          uniqueBotIps: number;
        }[]
      >(sql, since);

      return {
        range,
        bucket,
        generatedAt: now.toISOString(),
        points: rows.map((r) => ({
          at: new Date(r.bucket).toISOString(),
          totalHits: Number(r.totalHits) || 0,
          humanHits: Number(r.humanHits) || 0,
          botHits: Number(r.botHits) || 0,
          uniqueHumanIps: Number(r.uniqueHumanIps) || 0,
          uniqueBotIps: Number(r.uniqueBotIps) || 0,
        })),
      };
    } catch (e: unknown) {
      if (isMissingAdminTrafficTable(e)) {
        this.log.warn(`getHistory: ${TRAFFIC_MIGRATION_HINT}`);
        throw new BadRequestException(TRAFFIC_MIGRATION_HINT);
      }
      throw e;
    }
  }

  private sinceForRange(now: Date, range: LiveTrafficHistoryRange): Date {
    const d = new Date(now);
    if (range === 'day') d.setUTCDate(d.getUTCDate() - 1);
    else if (range === 'week') d.setUTCDate(d.getUTCDate() - 7);
    else if (range === 'month') d.setUTCMonth(d.getUTCMonth() - 1);
    else d.setUTCMonth(d.getUTCMonth() - 3);
    return d;
  }

  async getSummary(range: LiveTrafficHistoryRange): Promise<LiveTrafficSummary> {
    const now = new Date();
    const since = this.sinceForRange(now, range);

    const sql = `
      SELECT
        COUNT(*)::int AS "totalHits",
        COUNT(*) FILTER (WHERE "isBot" = false)::int AS "humanHits",
        COUNT(*) FILTER (WHERE "isBot" = true)::int AS "botHits"
      FROM "AdminTrafficHit"
      WHERE "createdAt" >= $1
    `;

    let rows: { totalHits: number; humanHits: number; botHits: number }[];
    try {
      rows = await this.prisma.$queryRawUnsafe<
        { totalHits: number; humanHits: number; botHits: number }[]
      >(sql, since);
    } catch (e: unknown) {
      if (isMissingAdminTrafficTable(e)) {
        this.log.warn(`getSummary: ${TRAFFIC_MIGRATION_HINT}`);
        throw new BadRequestException(TRAFFIC_MIGRATION_HINT);
      }
      throw e;
    }

    const r = rows[0] ?? { totalHits: 0, humanHits: 0, botHits: 0 };
    const total = Number(r.totalHits) || 0;
    const human = Number(r.humanHits) || 0;
    const bot = Number(r.botHits) || 0;
    const safe = total > 0 ? total : 1;

    return {
      range,
      generatedAt: now.toISOString(),
      totalHits: total,
      humanHits: human,
      botHits: bot,
      humanSharePct: Math.round((human / safe) * 1000) / 10,
      botSharePct: Math.round((bot / safe) * 1000) / 10,
    };
  }

  async getTopPaths(range: LiveTrafficHistoryRange, limit = 20): Promise<LiveTrafficTopPaths> {
    const now = new Date();
    const since = this.sinceForRange(now, range);
    const lim = Math.min(Math.max(Number(limit) || 20, 5), 100);

    const sql = `
      SELECT
        "path" AS path,
        COUNT(*)::int AS hits,
        COUNT(*) FILTER (WHERE "isBot" = false)::int AS "humanHits",
        COUNT(*) FILTER (WHERE "isBot" = true)::int AS "botHits"
      FROM "AdminTrafficHit"
      WHERE "createdAt" >= $1
      GROUP BY 1
      ORDER BY hits DESC
      LIMIT $2
    `;

    let rows: { path: string; hits: number; humanHits: number; botHits: number }[];
    try {
      rows = await this.prisma.$queryRawUnsafe<
        { path: string; hits: number; humanHits: number; botHits: number }[]
      >(sql, since, lim);
    } catch (e: unknown) {
      if (isMissingAdminTrafficTable(e)) {
        this.log.warn(`getTopPaths: ${TRAFFIC_MIGRATION_HINT}`);
        throw new BadRequestException(TRAFFIC_MIGRATION_HINT);
      }
      throw e;
    }

    return {
      range,
      generatedAt: now.toISOString(),
      limit: lim,
      rows: rows.map((x) => ({
        path: String(x.path ?? ''),
        hits: Number(x.hits) || 0,
        humanHits: Number(x.humanHits) || 0,
        botHits: Number(x.botHits) || 0,
      })),
    };
  }
}
