import {
  ForbiddenException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import {
  ModerationSanction,
  ModerationStatus,
  Prisma,
  ReportTargetType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PublicModerationDto = {
  status: ModerationStatus;
  until: string | null;
  reasonPublic: string | null;
  lastSanctionKind: ModerationSanction | null;
  lastSanctionAt: string | null;
};

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  isStaff(role?: string): boolean {
    return role === UserRole.ADMIN || role === UserRole.MODERATOR;
  }

  toPublicDto(u: {
    moderationStatus: ModerationStatus;
    moderationUntil: Date | null;
    moderationReasonPublic: string | null;
    lastSanctionKind: ModerationSanction | null;
    lastSanctionAt: Date | null;
  }): PublicModerationDto {
    const now = Date.now();

    let status = u.moderationStatus;
    if (status !== ModerationStatus.BANNED && u.moderationUntil && u.moderationUntil.getTime() <= now) {
      status = ModerationStatus.NONE;
    }

    const untilIso =
      u.moderationUntil && u.moderationUntil.getTime() > now ? u.moderationUntil.toISOString() : null;

    const badgeActive =
      (status !== ModerationStatus.NONE && status !== ModerationStatus.BANNED && untilIso !== null) ||
      status === ModerationStatus.BANNED;

    return {
      status: badgeActive ? status : ModerationStatus.NONE,
      until: badgeActive ? (status === ModerationStatus.BANNED ? null : untilIso) : null,
      reasonPublic: badgeActive ? u.moderationReasonPublic ?? null : null,
      lastSanctionKind: badgeActive ? u.lastSanctionKind ?? null : null,
      lastSanctionAt: badgeActive && u.lastSanctionAt ? u.lastSanctionAt.toISOString() : null,
    };
  }

  async publicSummaryForUsers(userIds: string[]): Promise<Map<string, PublicModerationDto>> {
    const ids = [...new Set(userIds.filter(Boolean))];
    const map = new Map<string, PublicModerationDto>();
    if (!ids.length) return map;

    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        moderationStatus: true,
        moderationUntil: true,
        moderationReasonPublic: true,
        lastSanctionKind: true,
        lastSanctionAt: true,
      },
    });
    for (const row of rows) {
      map.set(row.id, this.toPublicDto(row));
    }
    return map;
  }

  attachModerationToSenders<
    T extends { sender?: { id: string } | null },
  >(messages: T[], modMap: Map<string, PublicModerationDto>): Array<T & { senderModeration?: PublicModerationDto }> {
    return messages.map((m) => {
      const sid = m.sender?.id;
      const senderModeration = sid ? modMap.get(sid) : undefined;
      return { ...(m as object), ...(senderModeration ? { senderModeration } : {}) } as any;
    });
  }

  assertCanMutate(role: string | undefined, row: Pick<UserForModeration, keyof UserForModeration>): void {
    if (this.isStaff(role)) return;

    const now = Date.now();

    let status = row.moderationStatus;
    let untilMs = row.moderationUntil ? row.moderationUntil.getTime() : null;

    if (status !== ModerationStatus.BANNED && untilMs != null && untilMs <= now) {
      status = ModerationStatus.NONE;
      untilMs = null;
    }

    // Жизненная блокировка: только чтение (публичный GET можно; мутации — нет).
    if (status === ModerationStatus.BANNED) {
      throw new ForbiddenException(
        'Аккаунт заблокирован навсегда: доступны только просмотр и выход из аккаунта.',
      );
    }

    // Временная блокировка: нельзя публиковать контент и тратить VetCoin-сервисы.
    if (status === ModerationStatus.TEMP_SUSPENDED) {
      if (untilMs != null && untilMs > now) {
        throw new ForbiddenException(
          'Временная блокировка: публикация и платные действия недоступны до окончания срока.',
        );
      }
    }

    // Предупреждение само по себе не ограничивает действия.
  }

  assertCanSpendVetcoin(role: string | undefined, row: Pick<UserForModeration, keyof UserForModeration>): void {
    if (this.isStaff(role)) return;
    const now = Date.now();
    let status = row.moderationStatus;
    const untilMs = row.moderationUntil ? row.moderationUntil.getTime() : null;

    if (status !== ModerationStatus.BANNED && untilMs != null && untilMs <= now) {
      status = ModerationStatus.NONE;
    }

    if (status === ModerationStatus.BANNED) {
      throw new ForbiddenException('Аккаунт заблокирован: VetCoin недоступен.');
    }
    if (status === ModerationStatus.TEMP_SUSPENDED && untilMs != null && untilMs > now) {
      throw new ForbiddenException('Временная блокировка: списание VetCoin недоступно.');
    }
  }

  assertCanThank(role: string | undefined, row: Pick<UserForModeration, keyof UserForModeration>): void {
    if (this.isStaff(role)) return;
    const now = Date.now();
    let status = row.moderationStatus;
    const untilMs = row.moderationUntil ? row.moderationUntil.getTime() : null;

    if (status !== ModerationStatus.BANNED && untilMs != null && untilMs <= now) {
      status = ModerationStatus.NONE;
    }

    if (status === ModerationStatus.BANNED) {
      throw new ForbiddenException('Аккаунт заблокирован: действие недоступно.');
    }
    if (status === ModerationStatus.TEMP_SUSPENDED && untilMs != null && untilMs > now) {
      throw new ForbiddenException('Временная блокировка: «спасибо» недоступно.');
    }
  }

  assertCanOpenOrSendDm(role: string | undefined, row: Pick<UserForModeration, keyof UserForModeration>): void {
    this.assertCanMutate(role, row);
  }

  async applySanctionFromReport(opts: {
    reportId: string;
    moderatorId: string;
    targetUserId: string;
    sanction: ModerationSanction;
    reasonPublic?: string;
    temporaryHours?: number;
  }) {
    const reason = opts.reasonPublic?.trim() ? opts.reasonPublic.trim() : 'Нарушение правил площадки';
    const now = new Date();

    if (opts.sanction === ModerationSanction.WARN) {
      const ends = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return this.prisma.$transaction(async (tx) => {
        const updatedReport = await tx.report.update({
          where: { id: opts.reportId },
          data: {
            moderatedUserId: opts.targetUserId,
            moderatorUserId: opts.moderatorId,
            sanctionKind: ModerationSanction.WARN,
            sanctionEndsAt: ends,
            sanctionReasonPublic: reason,
            moderatedAt: now,
          },
        });

        await tx.user.update({
          where: { id: opts.targetUserId },
          data: {
            moderationStatus: ModerationStatus.WARNED,
            moderationUntil: ends,
            moderationReasonPublic: reason,
            lastSanctionKind: ModerationSanction.WARN,
            lastSanctionAt: now,
            lastSanctionReportId: opts.reportId,
          },
        });

        return updatedReport;
      });
    }

    if (opts.sanction === ModerationSanction.TEMP_SUSPEND) {
      const hours = opts.temporaryHours && opts.temporaryHours > 0 ? opts.temporaryHours : 72;
      const capped = Math.min(hours, 24 * 365);
      const ends = new Date(now.getTime() + capped * 60 * 60 * 1000);

      return this.prisma.$transaction(async (tx) => {
        const updatedReport = await tx.report.update({
          where: { id: opts.reportId },
          data: {
            moderatedUserId: opts.targetUserId,
            moderatorUserId: opts.moderatorId,
            sanctionKind: ModerationSanction.TEMP_SUSPEND,
            sanctionEndsAt: ends,
            sanctionReasonPublic: reason,
            moderatedAt: now,
          },
        });

        await tx.user.update({
          where: { id: opts.targetUserId },
          data: {
            moderationStatus: ModerationStatus.TEMP_SUSPENDED,
            moderationUntil: ends,
            moderationReasonPublic: reason,
            lastSanctionKind: ModerationSanction.TEMP_SUSPEND,
            lastSanctionAt: now,
            lastSanctionReportId: opts.reportId,
          },
        });

        return updatedReport;
      });
    }

    if (opts.sanction === ModerationSanction.LIFETIME_BAN) {
      return this.prisma.$transaction(async (tx) => {
        const updatedReport = await tx.report.update({
          where: { id: opts.reportId },
          data: {
            moderatedUserId: opts.targetUserId,
            moderatorUserId: opts.moderatorId,
            sanctionKind: ModerationSanction.LIFETIME_BAN,
            sanctionEndsAt: null,
            sanctionReasonPublic: reason,
            moderatedAt: now,
          },
        });

        await tx.user.update({
          where: { id: opts.targetUserId },
          data: {
            moderationStatus: ModerationStatus.BANNED,
            moderationUntil: null,
            moderationReasonPublic: reason,
            lastSanctionKind: ModerationSanction.LIFETIME_BAN,
            lastSanctionAt: now,
            lastSanctionReportId: opts.reportId,
          },
        });

        return updatedReport;
      });
    }

    throw new NotImplementedException();
  }

  /** Снимает истёкшие санкции WARN/TEMP на стороне БД (вызывать «лениво», не обязательно по cron). */
  async maybeClearExpiredSanctions(userId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, moderationStatus: true, moderationUntil: true },
    });
    if (!u) return;
    if (u.moderationStatus === ModerationStatus.BANNED) return;
    const until = u.moderationUntil;
    if (!until) return;
    if (until.getTime() > Date.now()) return;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        moderationStatus: ModerationStatus.NONE,
        moderationUntil: null,
        moderationReasonPublic: null,
      },
    });
  }

  resolveReportTargetUserId(report: {
    targetType: ReportTargetType;
    reportedUserId: string | null;
    threadId: string | null;
    postId: string | null;
    directMessageId: string | null;
    articleId: string | null;
    articleCommentId: string | null;
    listingMessageId: string | null;
    lobbyMessageId: string | null;
  }): string | null {
    switch (report.targetType) {
      case ReportTargetType.USER:
        return report.reportedUserId ?? null;
      case ReportTargetType.DIRECT_MESSAGE:
        return null; // sender resolved async
      case ReportTargetType.POST:
        return null;
      case ReportTargetType.THREAD:
        return null;
      case ReportTargetType.ARTICLE:
        return null;
      case ReportTargetType.ARTICLE_COMMENT:
        return null;
      case ReportTargetType.LISTING_MESSAGE:
        return null;
      case ReportTargetType.LOBBY_MESSAGE:
        return null;
      default:
        return null;
    }
  }

  async resolveModerationTargetUserId(reportId: string): Promise<string | null> {
    const r = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        targetType: true,
        reportedUserId: true,
        threadId: true,
        postId: true,
        directMessageId: true,
        articleId: true,
        articleCommentId: true,
        listingMessageId: true,
        lobbyMessageId: true,
      },
    });
    if (!r) return null;

    const quick = this.resolveReportTargetUserId(r);
    if (quick) return quick;

    if (r.targetType === ReportTargetType.POST && r.postId) {
      const p = await this.prisma.forumPost.findUnique({
        where: { id: r.postId },
        select: { authorId: true },
      });
      return p?.authorId ?? null;
    }
    if (r.targetType === ReportTargetType.THREAD && r.threadId) {
      const t = await this.prisma.forumThread.findUnique({
        where: { id: r.threadId },
        select: { authorId: true },
      });
      return t?.authorId ?? null;
    }
    if (r.targetType === ReportTargetType.DIRECT_MESSAGE && r.directMessageId) {
      const m = await this.prisma.directMessage.findUnique({
        where: { id: r.directMessageId },
        select: { senderId: true },
      });
      return m?.senderId ?? null;
    }
    if (r.targetType === ReportTargetType.ARTICLE && r.articleId) {
      const a = await this.prisma.article.findUnique({
        where: { id: r.articleId },
        select: { authorId: true },
      });
      return a?.authorId ?? null;
    }
    if (r.targetType === ReportTargetType.ARTICLE_COMMENT && r.articleCommentId) {
      const c = await this.prisma.articleComment.findUnique({
        where: { id: r.articleCommentId },
        select: { authorId: true },
      });
      return c?.authorId ?? null;
    }
    if (r.targetType === ReportTargetType.LISTING_MESSAGE && r.listingMessageId) {
      const m = await this.prisma.listingMessage.findUnique({
        where: { id: r.listingMessageId },
        select: { senderId: true },
      });
      return m?.senderId ?? null;
    }
    if (r.targetType === ReportTargetType.LOBBY_MESSAGE && r.lobbyMessageId) {
      const lm = await this.prisma.lobbyMessage.findUnique({
        where: { id: r.lobbyMessageId },
        select: { userId: true },
      });
      return lm?.userId ?? null;
    }

    return null;
  }
}

type UserForModeration = {
  moderationStatus: ModerationStatus;
  moderationUntil: Date | null;
};
