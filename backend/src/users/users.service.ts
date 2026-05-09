import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SpendVetcoinsDto, VetcoinClientSpendAction } from './dto/spend-vetcoins.dto';
import { VetcoinService } from '../vetcoin/vetcoin.service';
import { assertBirthDateReasonable, parseBirthDateLocal } from '../common/profile-birth.util';
import { ModerationService } from '../moderation/moderation.service';

/** Цены ярлыков синхронизированы с `BadgeStore.tsx` на фронте. */
const BADGE_PRICES: Record<string, number> = {
  expert: 200,
  helper: 150,
  star: 250,
  top: 300,
  verified: 180,
  premium: 500,
  legend: 1000,
  hero: 350,
  guru: 400,
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vetcoin: VetcoinService,
    private readonly moderation: ModerationService,
  ) {}

  /**
   * Учётка без Profile (импорт/ручной INSERT) ломала вход: логин успешен, а GET /users/me — 400 и фронт сбрасывал токены.
   */
  private async ensureMinimalProfile(userId: string, email: string): Promise<void> {
    const country =
      (await this.prisma.country.findUnique({ where: { code: 'RU' } })) ??
      (await this.prisma.country.findFirst({ orderBy: { code: 'asc' } }));
    const jobTitle =
      (await this.prisma.jobTitle.findFirst({
        where: { nameRu: 'Врач ветеринарной медицины' },
      })) ?? (await this.prisma.jobTitle.findFirst({ orderBy: { id: 'asc' } }));
    if (!country || !jobTitle) {
      throw new InternalServerErrorException(
        'Справочники стран или должностей пусты. Выполните миграции и seed базы данных.',
      );
    }
    const local = email.includes('@') ? email.split('@')[0]!.trim().slice(0, 80) : email.trim().slice(0, 80);
    const displayName = local.length > 0 ? local : 'Пользователь';
    await this.prisma.profile.create({
      data: {
        userId,
        displayName,
        city: '—',
        countryId: country.id,
        jobTitleId: jobTitle.id,
      },
    });
  }

  async me(userId: string) {
    await this.moderation.maybeClearExpiredSanctions(userId);

    const userSelect = {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
      totpEnabled: true,
      vetCoinBalance: true,
      createdAt: true,
      moderationStatus: true,
      moderationUntil: true,
      moderationReasonPublic: true,
      lastSanctionKind: true,
      lastSanctionAt: true,
      profile: {
        select: {
          countryId: true,
          jobTitleId: true,
          displayName: true,
          city: true,
            accountCategory: true,
          birthDate: true,
          avatarUrl: true,
          verification: true,
          country: { select: { nameRu: true } },
          jobTitle: { select: { nameRu: true } },
        },
      },
    } as const;

    let user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    if (!user.profile) {
      await this.ensureMinimalProfile(user.id, user.email);
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
      });
    }
    if (!user?.profile) {
      throw new InternalServerErrorException('Не удалось создать профиль пользователя. Обратитесь к администратору.');
    }

    const [
      forumThreadsCreated,
      forumPostsCreated,
      acceptedSolutionsCount,
      thanksReceivedCount,
      articlesPublished,
      articleCommentsCreated,
      listingsCreated,
      listingMessagesSent,
      sosRequestsCreated,
      lobbyMessagesSent,
      directMessagesSent,
    ] = await Promise.all([
      this.prisma.forumThread.count({ where: { authorId: userId } }),
      this.prisma.forumPost.count({ where: { authorId: userId } }),
      this.prisma.forumPost.count({
        where: { authorId: userId, acceptedAsSolutionIn: { isNot: null } },
      }),
      this.prisma.profileThank.count({ where: { toUserId: userId } }),
      this.prisma.article.count({ where: { authorId: userId, published: true } }),
      this.prisma.articleComment.count({ where: { authorId: userId } }),
      this.prisma.listing.count({ where: { authorId: userId } }),
      this.prisma.listingMessage.count({ where: { senderId: userId } }),
      this.prisma.sosRequest.count({ where: { authorId: userId } }),
      this.prisma.lobbyMessage.count({ where: { userId } }),
      this.prisma.directMessage.count({ where: { senderId: userId } }),
    ]);

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      moderation: this.moderation.toPublicDto({
        moderationStatus: user.moderationStatus,
        moderationUntil: user.moderationUntil,
        moderationReasonPublic: user.moderationReasonPublic,
        lastSanctionKind: user.lastSanctionKind,
        lastSanctionAt: user.lastSanctionAt,
      }),
      stats: {
        forumThreadsCreated,
        forumPostsCreated,
        acceptedSolutionsCount,
        thanksReceivedCount,
        articlesPublished,
        articleCommentsCreated,
        listingsCreated,
        listingMessagesSent,
        sosRequestsCreated,
        lobbyMessagesSent,
        directMessagesSent,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const modRow = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { moderationStatus: true, moderationUntil: true, role: true },
    });
    if (modRow) {
      this.moderation.assertCanMutate(modRow.role, modRow);
    }

    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException();
    let avatarNext: string | null | undefined;
    if (dto.avatarUrl !== undefined) {
      avatarNext = this.sanitizeUploadedAvatarUrl(dto.avatarUrl);
    }
    let birthDate: Date | undefined;
    if (dto.birthDate !== undefined && dto.birthDate.trim()) {
      birthDate = parseBirthDateLocal(dto.birthDate);
      assertBirthDateReasonable(birthDate);
    }
    return this.prisma.profile.update({
      where: { userId },
      data: {
        displayName: dto.displayName ?? undefined,
        city: dto.city ?? undefined,
        countryId: dto.countryId ?? undefined,
        jobTitleId: dto.jobTitleId ?? undefined,
        accountCategory: dto.accountCategory ? (dto.accountCategory as any) : undefined,
        avatarUrl: avatarNext !== undefined ? avatarNext : undefined,
        ...(birthDate ? { birthDate } : {}),
      },
      include: { country: true, jobTitle: true },
    });
  }

  /** Разрешены только локальные пути загрузчиков приложения (/uploads/avatars/…) */
  private sanitizeUploadedAvatarUrl(raw: string | undefined): string | null {
    const v = raw?.trim() ?? '';
    if (!v) return null;
    if (
      !/^\/uploads\/avatars\/[a-zA-Z0-9._-]+\.(jpe?g|png|webp|gif)$/i.test(v) ||
      v.length > 500
    ) {
      throw new BadRequestException(
        'Аватар: используйте URL из POST /api/uploads/avatar или очистите поле.',
      );
    }
    return v;
  }

  async myVetcoins(userId: string, page = 1) {
    const [row, ledger, currencyDisplayName] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { vetCoinBalance: true },
      }),
      this.vetcoin.ledger(userId, page, 60),
      this.vetcoin.settingText('vetcoin.display_name', 'VetCoin'),
    ]);

    return {
      currencyDisplayName,
      balance: row?.vetCoinBalance ?? 0,
      ledger,
    };
  }

  async forumActivity(userId: string) {
    const [threadsCreated, postsCreated] = await Promise.all([
      this.prisma.forumThread.count({ where: { authorId: userId } }),
      this.prisma.forumPost.count({ where: { authorId: userId } }),
    ]);
    return { threadsCreated, postsCreated };
  }

  async notifications(userId: string) {
    return this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        type: true,
        threadId: true,
        conversationId: true,
        articleId: true,
        listingId: true,
        actorUserId: true,
        title: true,
        body: true,
        read: true,
        createdAt: true,
      },
    });
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const r = await this.prisma.userNotification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    if (r.count === 0) throw new NotFoundException();
    return { ok: true };
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.userNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const r = await this.prisma.userNotification.deleteMany({
      where: { id: notificationId, userId },
    });
    if (r.count === 0) throw new NotFoundException();
    return { ok: true };
  }

  async spendVetcoins(userId: string, dto: SpendVetcoinsDto) {
    const modRow = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { moderationStatus: true, moderationUntil: true, role: true },
    });
    if (modRow) {
      this.moderation.assertCanSpendVetcoin(modRow.role, modRow);
    }

    let delta = 0;
    let reason = '';
    switch (dto.action) {
      case VetcoinClientSpendAction.TOOL_DOSAGE: {
        const n = await this.vetcoin.settingInt('vetcoin.tool_dosage_cost', 20);
        delta = -n;
        reason = 'AI-калькулятор дозировки';
        break;
      }
      case VetcoinClientSpendAction.TOOL_ANALYZER: {
        const n = await this.vetcoin.settingInt('vetcoin.tool_analyzer_cost', 50);
        delta = -n;
        reason = 'AI-анализ диагностики';
        break;
      }
      case VetcoinClientSpendAction.BADGE_PURCHASE: {
        if (dto.gift !== true) {
          throw new BadRequestException(
            'Ярлыки из магазина можно только дарить другим: самопокупка отключена.',
          );
        }
        const bid = dto.badgeId?.trim().toLowerCase();
        if (!bid || BADGE_PRICES[bid] === undefined) {
          throw new BadRequestException('Неизвестный ярлык');
        }
        const giftExtra = 50;
        delta = -(BADGE_PRICES[bid] + giftExtra);
        reason = `Подарок ярлыка (${bid}), оформление`;
        break;
      }
      default:
        throw new BadRequestException('Действие не поддерживается');
    }
    return this.vetcoin.applyDelta(userId, delta, reason);
  }
}
