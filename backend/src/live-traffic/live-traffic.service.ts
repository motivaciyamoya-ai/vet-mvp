import { Injectable } from '@nestjs/common';
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

const DEFAULT_WINDOW_SEC = 300;
const MAX_STORED = 2500;
const MAX_SNIPPET_UA = 200;
/** Хранить события дольше максимального окна снимка (3600 с), чтобы длинное окно в UI не было пустым. */
const RETAIN_EVENTS_MS = 7200 * 1000;

@Injectable()
export class LiveTrafficService {
  private readonly events: { at: number; ip: string; method: string; path: string; ua: string }[] = [];

  /** Текущее окно наблюдения в секундах (для UI) */
  private windowSec = DEFAULT_WINDOW_SEC;

  setWindowSec(sec: number) {
    const s = Math.min(Math.max(Number(sec) || DEFAULT_WINDOW_SEC, 30), 3600);
    this.windowSec = s;
  }

  getWindowSec(): number {
    return this.windowSec;
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
}
