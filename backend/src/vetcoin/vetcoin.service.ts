import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Публичные ключи конфигурации VetCoin в SiteSetting (префикс vetcoin.) */
export const VETCOIN_SETTING_KEYS = [
  'vetcoin.display_name',
  'vetcoin.registration_bonus',
  'vetcoin.forum_new_thread_bonus',
  'vetcoin.forum_reply_bonus',
  'vetcoin.hot_topic_cost',
  /** Бонус коллеге, чей ответ отметили автором решением в горячей теме. */
  'vetcoin.hot_topic_solution_bonus',
  'vetcoin.tool_dosage_cost',
  'vetcoin.tool_analyzer_cost',
  'vetcoin.urgent_help_reward_high',
  'vetcoin.urgent_help_reward_critical',
  'vetcoin.daily_login_bonus',
  'vetcoin.article_publish_bonus',
] as const;

@Injectable()
export class VetcoinService {
  constructor(private readonly prisma: PrismaService) {}

  async settingInt(key: string, fallback: number): Promise<number> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    if (!row?.value) return fallback;
    const n = parseInt(row.value, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  async settingText(key: string, fallback: string): Promise<string> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    const v = row?.value?.trim();
    return v && v.length > 0 ? v : fallback;
  }

  /**
   * Начисление/списание. delta &lt; 0 — списание, не ниже нуля по балансу.
   */
  async applyDeltaInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    delta: number,
    reason: string,
  ) {
    const u = await tx.user.findUnique({
      where: { id: userId },
      select: { vetCoinBalance: true },
    });
    if (!u) throw new NotFoundException();
    if (delta === 0) return { balance: u.vetCoinBalance };
    const next = u.vetCoinBalance + delta;
    if (next < 0) throw new BadRequestException('Недостаточно VetCoin');
    await tx.user.update({
      where: { id: userId },
      data: { vetCoinBalance: next },
    });
    await tx.vetCoinLedger.create({
      data: {
        userId,
        delta,
        balanceAfter: next,
        reason,
      },
    });
    return { balance: next };
  }

  async applyDelta(userId: string, delta: number, reason: string) {
    if (delta === 0) {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { vetCoinBalance: true },
      });
      if (!u) throw new NotFoundException();
      return { balance: u.vetCoinBalance };
    }
    return this.prisma.$transaction((tx) => this.applyDeltaInTransaction(tx, userId, delta, reason));
  }

  async ledger(userId: string, page = 1, pageSize = 40) {
    const take = Math.min(pageSize, 100);
    const skip = (page - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.vetCoinLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.vetCoinLedger.count({ where: { userId } }),
    ]);
    return { items, total, page, pageSize: take };
  }
}
