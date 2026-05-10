import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { countPublishedArticlesForAuthor } from '../common/article-published-count';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  /** Пользователи A и B всегда в одном каноническом порядке для связей и уникальных пар. */
  static normalizedPair(userA: string, userB: string): [string, string] {
    return userA <= userB ? [userA, userB] : [userB, userA];
  }

  async publicProfile(viewedUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: viewedUserId },
      select: {
        id: true,
        createdAt: true,
        moderationStatus: true,
        moderationUntil: true,
        moderationReasonPublic: true,
        lastSanctionKind: true,
        lastSanctionAt: true,
        profile: {
          select: {
            displayName: true,
            city: true,
            avatarUrl: true,
            verification: true,
            country: { select: { nameRu: true } },
            jobTitle: { select: { nameRu: true } },
          },
        },
      },
    });
    if (!user?.profile) throw new NotFoundException();

    const [
      forumThreadsCreated,
      forumPostsCreated,
      acceptedSolutionsCount,
      thanksReceivedCount,
      articlesPublished,
    ] = await Promise.all([
      this.prisma.forumThread.count({ where: { authorId: viewedUserId } }),
      this.prisma.forumPost.count({ where: { authorId: viewedUserId } }),
      this.prisma.forumPost.count({
        where: { authorId: viewedUserId, acceptedAsSolutionIn: { isNot: null } },
      }),
      this.prisma.profileThank.count({ where: { toUserId: viewedUserId } }),
      countPublishedArticlesForAuthor(this.prisma, viewedUserId),
    ]);

    return {
      userId: user.id,
      joinedAt: user.createdAt.toISOString(),
      profile: {
        displayName: user.profile.displayName,
        city: user.profile.city,
        avatarUrl: user.profile.avatarUrl,
        verification: user.profile.verification,
        country: { nameRu: user.profile.country.nameRu },
        jobTitle: { nameRu: user.profile.jobTitle.nameRu },
      },
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
      },
    };
  }

  async viewerRelation(viewerUserId: string, targetUserId: string) {
    if (viewerUserId === targetUserId) {
      return { isSelf: true, thanked: false, conversationId: null as string | null };
    }
    const thanked = !!(await this.prisma.profileThank.findUnique({
      where: { fromUserId_toUserId: { fromUserId: viewerUserId, toUserId: targetUserId } },
      select: { id: true },
    }));

    let conversationId: string | null = null;
    const [low, high] = ProfilesService.normalizedPair(viewerUserId, targetUserId);
    const conv = await this.prisma.directConversation.findUnique({
      where: { userLowId_userHighId: { userLowId: low, userHighId: high } },
      select: { id: true },
    });
    conversationId = conv?.id ?? null;

    return { isSelf: false, thanked, conversationId };
  }

  async thank(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) throw new ForbiddenException();

    const target = await this.prisma.profile.findUnique({ where: { userId: toUserId } });
    if (!target) throw new NotFoundException();

    const modFrom = await this.prisma.user.findUnique({
      where: { id: fromUserId },
      select: { moderationStatus: true, moderationUntil: true, role: true },
    });
    if (modFrom) {
      this.moderation.assertCanThank(modFrom.role, modFrom);
    }

    const fromProfile = await this.prisma.profile.findUnique({
      where: { userId: fromUserId },
      select: { displayName: true },
    });
    const fromName = fromProfile?.displayName?.trim() || 'Участник';

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.profileThank.create({
          data: { fromUserId, toUserId },
        });
        await tx.userNotification.create({
          data: {
            userId: toUserId,
            type: 'PROFILE_THANK_RECEIVED',
            title: `${fromName} поблагодарил вас`,
            body: 'Коллега нажал «Сказать спасибо» на вашей странице.',
            threadId: null,
            conversationId: null,
            actorUserId: fromUserId,
          },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Вы уже поблагодарили этого пользователя');
      }
      throw e;
    }

    return { ok: true, thanksReceivedCount: await this.countThanksTo(toUserId) };
  }

  private async countThanksTo(toUserId: string) {
    return this.prisma.profileThank.count({ where: { toUserId } });
  }
}
