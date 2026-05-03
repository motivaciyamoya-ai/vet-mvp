import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CHAT_MESSAGES_RETENTION_LIMIT } from '../chat-retention.constants';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationService } from '../moderation/moderation.service';

const TAKE = 48;

const LOBBY_EMOJI_SET = new Set(['👍', '❤️', '😂', '🔥', '👏', '🎉', '💬', '😮', '✨', '🙏']);

@Injectable()
export class HomeChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  async listMessages(viewerId: string) {
    const rows = await this.prisma.lobbyMessage.findMany({
      take: TAKE,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
        reactions: { select: { emoji: true, userId: true } },
      },
    });

    const chronological = rows.reverse();

    const modMap = await this.moderation.publicSummaryForUsers(chronological.map((m) => m.userId));

    return {
      messages: chronological.map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        sender: {
          id: m.userId,
          displayName: m.user.profile?.displayName?.trim() || 'Участник',
          avatarUrl: m.user.profile?.avatarUrl ?? null,
          moderation: modMap.get(m.userId),
        },
        reactions: this.aggregateReactions(m.reactions, viewerId),
      })),
    };
  }

  private aggregateReactions(
    rows: { emoji: string; userId: string }[],
    viewerId: string,
  ): { emoji: string; count: number; reactedByMe: boolean }[] {
    const map = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const r of rows) {
      const cur = map.get(r.emoji) ?? { count: 0, reactedByMe: false };
      cur.count += 1;
      if (r.userId === viewerId) cur.reactedByMe = true;
      map.set(r.emoji, cur);
    }
    return [...map.entries()]
      .map(([emoji, v]) => ({ emoji, count: v.count, reactedByMe: v.reactedByMe }))
      .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));
  }

  async postMessage(userId: string, bodyRaw: string) {
    const body = bodyRaw.replace(/\r\n/g, '\n').trim();
    if (!body.length) throw new BadRequestException('Пустое сообщение');

    const limit = CHAT_MESSAGES_RETENTION_LIMIT;
    const msg = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lobbyMessage.create({
        data: { userId, body: body.slice(0, 1600) },
        include: {
          user: {
            select: {
              id: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
          reactions: { select: { emoji: true, userId: true } },
        },
      });

      await tx.$executeRaw`
        DELETE FROM "LobbyMessage"
        WHERE id IN (
          SELECT id FROM (
            SELECT id FROM "LobbyMessage"
            ORDER BY "createdAt" ASC, "id" ASC
            LIMIT GREATEST(0, (SELECT COUNT(*)::int FROM "LobbyMessage") - ${limit})
          ) sub
        )`;

      return created;
    });

    const modMap = await this.moderation.publicSummaryForUsers([msg.userId]);

    return {
      id: msg.id,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      sender: {
        id: msg.userId,
        displayName: msg.user.profile?.displayName?.trim() || 'Участник',
        avatarUrl: msg.user.profile?.avatarUrl ?? null,
        moderation: modMap.get(msg.userId),
      },
      reactions: this.aggregateReactions(msg.reactions, userId),
    };
  }

  async toggleReaction(userId: string, messageId: string, emoji: string) {
    const e = emoji.trim();
    if (!LOBBY_EMOJI_SET.has(e)) {
      throw new BadRequestException('Недопустимая реакция');
    }
    const msg = await this.prisma.lobbyMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException();

    const existing = await this.prisma.lobbyMessageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji: e } },
    });

    if (existing) {
      await this.prisma.lobbyMessageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      try {
        await this.prisma.lobbyMessageReaction.create({
          data: { messageId, userId, emoji: e },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          /* гонка */
        } else throw e;
      }
    }

    const reactions = await this.prisma.lobbyMessageReaction.findMany({
      where: { messageId },
      select: { emoji: true, userId: true },
    });
    return { reactions: this.aggregateReactions(reactions, userId) };
  }
}
