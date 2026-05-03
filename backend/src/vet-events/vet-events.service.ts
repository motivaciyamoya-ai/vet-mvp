import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';
import ical from 'node-ical';
import Parser from 'rss-parser';
import { randomUUID } from 'crypto';

const SETTING_EVENTS_ICS = 'events.sources.ics';
const SETTING_EVENTS_RSS = 'events.sources.rss';

export type VetEventSyncResultItem = {
  feedUrl: string;
  kind: 'ics' | 'rss';
  upserted: number;
  error?: string;
};

export type VetEventSyncSummary = {
  ranAt: string;
  feeds: VetEventSyncResultItem[];
};

@Injectable()
export class VetEventsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VetEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Один пробный запуск после старта, чтобы ICS/RSS без CRON давали результат в dev. */
  onApplicationBootstrap(): void {
    if (this.config.get<string>('EVENTS_SKIP_BOOTSTRAP_SYNC')?.trim() === '1') {
      return;
    }
    const delayMs =
      Number(this.config.get<string>('EVENTS_BOOTSTRAP_SYNC_DELAY_MS')) || 90_000;
    setTimeout(() => {
      this.syncExternalFeeds(true).catch((e) =>
        this.logger.warn(`Bootstrap events sync skipped: ${(e as Error).message}`),
      );
    }, delayMs);
  }

  async list(fromIso?: string, toIso?: string) {
    const from = fromIso ? new Date(fromIso) : new Date(Date.now() - 90 * 86400_000);
    const to = toIso ? new Date(toIso) : new Date(Date.now() + 540 * 86400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Неверный интервал дат (from/to).');
    }
    if (from > to) {
      throw new BadRequestException('from не может быть позже to.');
    }

    const items = await this.prisma.vetEvent.findMany({
      where: { startsAt: { gte: from, lte: to } },
      orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
    });
    return { from: from.toISOString(), to: to.toISOString(), items };
  }

  async getSourcesConfig(): Promise<{ icsText: string; rssText: string }> {
    const [ics, rss] = await Promise.all([
      this.prisma.siteSetting.findUnique({ where: { key: SETTING_EVENTS_ICS } }),
      this.prisma.siteSetting.findUnique({ where: { key: SETTING_EVENTS_RSS } }),
    ]);
    return {
      icsText: ics?.value ?? '',
      rssText: rss?.value ?? '',
    };
  }

  /** Частичное обновление: поля можно не передавать. */
  async putSourcesConfig(icsText?: string, rssText?: string): Promise<{ icsText: string; rssText: string }> {
    // Prisma.$transaction(array) принимает только PrismaPromise[], не обычные Promise.
    const ops = [];
    if (icsText !== undefined) {
      ops.push(
        this.prisma.siteSetting.upsert({
          where: { key: SETTING_EVENTS_ICS },
          update: { value: icsText },
          create: { key: SETTING_EVENTS_ICS, value: icsText },
        }),
      );
    }
    if (rssText !== undefined) {
      ops.push(
        this.prisma.siteSetting.upsert({
          where: { key: SETTING_EVENTS_RSS },
          update: { value: rssText },
          create: { key: SETTING_EVENTS_RSS, value: rssText },
        }),
      );
    }
    if (ops.length > 0) await this.prisma.$transaction(ops);
    return this.getSourcesConfig();
  }

  async createManualEvent(input: {
    title: string;
    description?: string;
    location?: string;
    url?: string;
    startsAt: Date;
    endsAt?: Date;
  }) {
    if (Number.isNaN(input.startsAt.getTime())) {
      throw new BadRequestException('Неверная дата начала');
    }
    let endsAt = input.endsAt ?? null;
    if (endsAt && Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Неверная дата окончания');
    }
    if (endsAt && endsAt.getTime() <= input.startsAt.getTime()) {
      throw new BadRequestException('Окончание должно быть позже начала');
    }
    if (!endsAt) {
      endsAt = new Date(input.startsAt.getTime() + 2 * 3600 * 1000);
    }

    const uid = randomUUID();
    const slugKey = this.hashKey(['manual', uid]);

    return this.prisma.vetEvent.create({
      data: {
        slugKey,
        title: truncate(input.title.trim(), 480),
        description: truncate((input.description ?? '').trim(), 45000),
        location: truncate((input.location ?? '').trim(), 480),
        url: sanitizeHttpUrl(input.url?.trim()) ?? null,
        startsAt: input.startsAt,
        endsAt,
        timezone: null,
        source: 'manual',
        sourceFeed: 'admin',
        externalUid: truncate(uid.replace(/-/g, ''), 1024),
      },
    });
  }

  async listEventsAdmin(take = 80) {
    const lim = Math.min(Math.max(Number(take) || 80, 1), 200);
    return this.prisma.vetEvent.findMany({
      orderBy: { startsAt: 'desc' },
      take: lim,
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        source: true,
        sourceFeed: true,
        url: true,
        location: true,
        createdAt: true,
      },
    });
  }

  async deleteEventById(id: string): Promise<{ ok: true }> {
    const r = await this.prisma.vetEvent.deleteMany({ where: { id } });
    if (r.count === 0) throw new NotFoundException();
    return { ok: true };
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  scheduledSync(): void {
    void this.syncExternalFeeds(false);
  }

  /** Синхронизация ICS/RSS из SiteSetting и env. */
  async syncExternalFeeds(quietBootstrap: boolean): Promise<VetEventSyncSummary> {
    const icsFeeds = uniqUrls([
      ...(await this.urlsFromSetting(SETTING_EVENTS_ICS)),
      ...commaEnvUrls(this.config.get<string>('EVENTS_ICS_URLS')),
    ]);
    const rssFeeds = uniqUrls([
      ...(await this.urlsFromSetting(SETTING_EVENTS_RSS)),
      ...commaEnvUrls(this.config.get<string>('EVENTS_RSS_URLS')),
    ]);

    const feeds: VetEventSyncResultItem[] = [];

    for (const url of icsFeeds) {
      feeds.push(await this.ingestOneIcs(url, quietBootstrap));
    }
    for (const url of rssFeeds) {
      feeds.push(await this.ingestOneRss(url, quietBootstrap));
    }

    return { ranAt: new Date().toISOString(), feeds };
  }

  private hashKey(parts: string[]): string {
    return createHash('sha256').update(parts.join('|'), 'utf8').digest('hex');
  }

  private async urlsFromSetting(key: string): Promise<string[]> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    return parseLinesToUrls(row?.value ?? '');
  }

  private async ingestOneIcs(feedUrl: string, quietBootstrap: boolean): Promise<VetEventSyncResultItem> {
    const item: VetEventSyncResultItem = { feedUrl, kind: 'ics', upserted: 0 };
    try {
      const raw = await this.fetchText(feedUrl);
      const data = ical.parseICS(raw);
      let upserted = 0;
      for (const k of Object.keys(data)) {
        const row = data[k] as Record<string, unknown> & {
          type?: string;
          rrule?: unknown;
          start?: unknown;
          end?: unknown;
        };
        if (row.type !== 'VEVENT') continue;
        if (row.rrule != null) {
          continue;
        }
        const start = asDateMaybe(row.start);
        if (!(start instanceof Date) || Number.isNaN(start.getTime())) continue;
        const uid = coerceStr(row.uid) || '';
        const summary = coerceStr(row.summary)?.trim();
        const title =
          truncate(summary || coerceStr(row.description)?.trim()?.slice(0, 140) || 'Событие', 480) ||
          'Событие без названия';

        let endVal = row.end != null ? asDateMaybe(row.end) : undefined;
        if (!(endVal instanceof Date) || Number.isNaN(endVal.getTime())) endVal = undefined;
        let endsAt: Date | null = endVal ?? null;

        const description = coerceStr(row.description)?.trimStart() ?? '';
        const location = coerceStr(row.location)?.trim() ?? '';

        let url: string | undefined = pickHrefFromIcal(fieldUrl(row.url));
        if (!url && row.attach) url = gleanUrlFromAttachments(row.attach);
        url = sanitizeHttpUrl(url);

        const slugKey = this.hashKey(['ics', feedUrl, uid, String(start.getTime())]);

        if (!endsAt || endsAt.getTime() <= start.getTime()) {
          endsAt = new Date(start.getTime() + 60 * 60_000);
        }

        await this.prisma.vetEvent.upsert({
          where: { slugKey },
          create: {
            slugKey,
            title,
            description: truncate(description, 45000),
            location: truncate(location, 480),
            url: url ?? null,
            startsAt: start,
            endsAt,
            timezone: null,
            source: 'ics',
            sourceFeed: feedUrl,
            externalUid: truncate(uid, 1024),
          },
          update: {
            title,
            description: truncate(description, 45000),
            location: truncate(location, 480),
            url: url ?? null,
            startsAt: start,
            endsAt,
          },
        });
        upserted += 1;
      }
      item.upserted = upserted;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      item.error = msg;
      if (!quietBootstrap) this.logger.warn(`ICS ingest failed (${feedUrl}): ${msg}`);
    }
    return item;
  }

  private async ingestOneRss(feedUrl: string, quietBootstrap: boolean): Promise<VetEventSyncResultItem> {
    const item: VetEventSyncResultItem = { feedUrl, kind: 'rss', upserted: 0 };
    try {
      const xml = await this.fetchText(feedUrl);
      const parser = new Parser({
        timeout: 20_000,
        headers: { 'User-Agent': 'VetConnect-events/1.0' },
      });
      const feed = await parser.parseString(xml);

      let upserted = 0;
      for (const rssItem of feed.items ?? []) {
        const guid = rssGuidPlain(rssItem.guid, rssItem.id);
        const pubDateIso = coerceStr(rssItem.isoDate) || coerceStr(rssItem.pubDate);
        const startsAtRaw = pubDateIso ? new Date(pubDateIso) : new Date();
        if (!(startsAtRaw instanceof Date) || Number.isNaN(startsAtRaw.getTime())) continue;

        const title =
          truncate(coerceStr(rssItem.title)?.trim() ?? 'Запись из RSS', 480) ?? 'Запись из RSS';
        const snippet = coerceStr(rssItem.contentSnippet) || coerceStr(rssItem.content) || '';

        const linkRaw =
          typeof rssItem.link === 'string'
            ? rssItem.link.trim()
            : typeof rssItem.link === 'object' && rssItem.link !== null && 'href' in rssItem.link
              ? coerceStr((rssItem.link as { href?: unknown }).href)?.trim()
              : undefined;
        const link = sanitizeHttpUrl(linkRaw);

        const dedupeId = `${guid}:${title}:${startsAtRaw.getTime()}:${link ?? ''}`;
        const slugKey = this.hashKey(['rss', feedUrl, dedupeId]);

        await this.prisma.vetEvent.upsert({
          where: { slugKey },
          create: {
            slugKey,
            title,
            description: truncate(stripTags(snippet || title), 45000),
            location: '',
            url: link ?? null,
            startsAt: startsAtRaw,
            endsAt: new Date(startsAtRaw.getTime() + 48 * 60 * 60_000),
            source: 'rss',
            sourceFeed: feedUrl,
            externalUid: truncate(guid, 2048),
          },
          update: {
            title,
            description: truncate(stripTags(snippet || title), 45000),
            url: link ?? null,
            startsAt: startsAtRaw,
            endsAt: new Date(startsAtRaw.getTime() + 48 * 60 * 60_000),
          },
        });
        upserted += 1;
      }
      item.upserted = upserted;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      item.error = msg;
      if (!quietBootstrap) this.logger.warn(`RSS ingest failed (${feedUrl}): ${msg}`);
    }
    return item;
  }

  private async fetchText(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        Accept: 'text/calendar,text/plain,application/rss+xml,text/xml,*/*',
        'User-Agent': 'VetConnect-events/1.0 (+calendar sync)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return res.text();
  }
}

function uniqUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const t = u.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function parseLinesToUrls(raw: string): string[] {
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    out.push(t);
  }
  return out;
}

function commaEnvUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

function coerceStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

function asDateMaybe(v: unknown): Date | undefined {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function fieldUrl(v: unknown): unknown {
  if (v == null) return undefined;
  if (typeof v === 'object' && v !== null && 'val' in v) {
    return (v as { val?: unknown }).val;
  }
  return v;
}

function pickHrefFromIcal(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null) {
    const o = v as { val?: unknown; href?: unknown };
    if (typeof o.val === 'string') return o.val;
    if (typeof o.href === 'string') return o.href;
  }
  return undefined;
}

function gleanUrlFromAttachments(attach: unknown): string | undefined {
  if (typeof attach === 'string') return attach;
  if (Array.isArray(attach)) {
    for (const a of attach) {
      const u = pickHrefFromIcal(a);
      if (u && /^https?:\/\//i.test(u)) return u;
    }
  }
  return undefined;
}

function sanitizeHttpUrl(u: string | undefined): string | undefined {
  if (!u || typeof u !== 'string') return undefined;
  const t = u.trim();
  if (!/^https?:\/\//i.test(t)) return undefined;
  return t.slice(0, 2000);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function rssGuidPlain(guidVal: unknown, id?: string): string {
  const fromId = coerceStr(id)?.trim();
  if (fromId) return fromId;
  if (typeof guidVal === 'string') return guidVal.trim();
  if (guidVal && typeof guidVal === 'object') {
    const g = guidVal as { _?: unknown };
    const inner = coerceStr(g._)?.trim();
    if (inner) return inner;
  }
  return '';
}
