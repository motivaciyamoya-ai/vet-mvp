import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CHAT_MESSAGES_RETENTION_LIMIT } from '../chat-retention.constants';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationService } from '../moderation/moderation.service';

/** Грубое снятие разметки Markdown для превью в списке диалогов */
function stripMarkdownish(input: string): string {
  let t = input;
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/_([^_\s][^_]*)_/g, '$1');
  t = t.replace(/`([^`]+)`/g, '$1');
  t = t.replace(/~~([^~]+)~~/g, '$1');
  t = t.replace(/!\[[^\]]*]\([^)]*\)/g, ' ');
  t = t.replace(/\[([^\]]+)]\([^)]*\)/g, '$1');
  t = t.replace(/^>{1}\s?/gm, '');
  t = t.replace(/^[-*]\s+/gm, '');
  t = t.replace(/^\d+\.\s+/gm, '');
  return t.replace(/\s+/g, ' ').trim();
}

function previewBody(raw: string, max = 200) {
  const t = stripMarkdownish(raw).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

type ConversationListRow = {
  id: string;
  peer: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    city: string;
    country: { nameRu: string };
    moderation?: unknown;
  };
  lastMessage: {
    bodyPreview: string;
    createdAt: string;
    senderId: string;
    readAt: string | null;
  } | null;
  unreadCount: number;
  updatedAt: string;
};

@Injectable()
export class DirectMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  private normalizedPair(userA: string, userB: string): [string, string] {
    return userA <= userB ? [userA, userB] : [userB, userA];
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const c = await this.prisma.directConversation.findUnique({
      where: { id: conversationId },
      select: { userLowId: true, userHighId: true },
    });
    if (!c) throw new NotFoundException();
    if (c.userLowId !== userId && c.userHighId !== userId) throw new ForbiddenException();
    return c;
  }

  private miniProfileSelect() {
    return {
      select: {
        displayName: true,
        avatarUrl: true,
        city: true,
        country: { select: { nameRu: true } },
        jobTitle: { select: { nameRu: true } },
      },
    } as const;
  }

  private peerFromConv(
    c: {
      userLowId: string;
      userHighId: string;
      userLow: { id: string; profile: unknown };
      userHigh: { id: string; profile: unknown };
    },
    viewerId: string,
  ) {
    return viewerId === c.userLowId ? { id: c.userHighId, profile: c.userHigh.profile } : {
        id: c.userLowId,
        profile: c.userLow.profile,
      };
  }

  /** Создаёт диалог при необходимости; при initialBody отправляет первое сообщение от currentUserId. */
  async openConversation(currentUserId: string, peerUserId: string, initialBody?: string) {
    if (peerUserId === currentUserId) throw new ForbiddenException('Нельзя написать самому себе');

    const peerProfile = await this.prisma.profile.findUnique({ where: { userId: peerUserId } });
    if (!peerProfile) throw new NotFoundException('Профиль пользователя не найден');

    const [low, high] = this.normalizedPair(currentUserId, peerUserId);
    const conv =
      (await this.prisma.directConversation.findUnique({
        where: { userLowId_userHighId: { userLowId: low, userHighId: high } },
      })) ??
      (await this.prisma.directConversation.create({
        data: { userLowId: low, userHighId: high },
      }));

    let firstMessageSent = false;
    const trimmed = initialBody?.trim() ?? '';
    if (trimmed.length > 0) {
      await this.sendRaw(conv.id, currentUserId, peerUserId, trimmed);
      firstMessageSent = true;
    }

    return {
      conversationId: conv.id,
      peerUserId,
      firstMessageSent,
      peer: await this.peerPublicSnippet(peerUserId),
    };
  }

  async peerPublicSnippet(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profile: this.miniProfileSelect() },
    });
    if (!u?.profile) throw new NotFoundException();
    const p = u.profile as {
      displayName: string;
      avatarUrl: string | null;
      city: string;
      country: { nameRu: string };
      jobTitle: { nameRu: string };
    };
    const modMap = await this.moderation.publicSummaryForUsers([userId]);

    return {
      id: u.id,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      city: p.city,
      country: p.country,
      jobTitle: p.jobTitle,
      moderation: modMap.get(userId),
    };
  }

  /** Добавить сообщение + уведомление получателя. */
  async send(conversationId: string, senderId: string, body: string) {
    const conv = await this.assertParticipant(conversationId, senderId);
    const peerId = conv.userLowId === senderId ? conv.userHighId : conv.userLowId;
    return this.sendRaw(conversationId, senderId, peerId, body);
  }

  private async sendRaw(conversationId: string, senderId: string, recipientId: string, body: string) {
    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestException('Пустое сообщение');

    const limit = CHAT_MESSAGES_RETENTION_LIMIT;
    const msg = await this.prisma.$transaction(async (tx) => {
      const created = await tx.directMessage.create({
        data: { conversationId, senderId, body: trimmed },
      });

      await tx.$executeRaw`
        DELETE FROM "DirectMessage"
        WHERE "conversationId" = ${conversationId}
          AND id IN (
            SELECT id FROM (
              SELECT id FROM "DirectMessage"
              WHERE "conversationId" = ${conversationId}
              ORDER BY "createdAt" ASC, "id" ASC
              LIMIT GREATEST(
                0,
                (
                  SELECT COUNT(*)::int
                  FROM "DirectMessage"
                  WHERE "conversationId" = ${conversationId}
                ) - ${limit}
              )
            ) sub
          )`;

      const senderProf = await tx.profile.findUnique({
        where: { userId: senderId },
        select: { displayName: true },
      });
      const name = senderProf?.displayName?.trim() || 'Участник';

      await tx.userNotification.create({
        data: {
          userId: recipientId,
          type: 'DIRECT_MESSAGE',
          threadId: null,
          conversationId,
          title: `Сообщение от ${name}`,
          body: previewBody(trimmed),
        },
      });

      await tx.directConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      body: msg.body,
      readAt: msg.readAt?.toISOString() ?? null,
      createdAt: msg.createdAt.toISOString(),
    };
  }

  async listMessages(conversationId: string, viewerId: string, take = 80) {
    await this.assertParticipant(conversationId, viewerId);

    const items = await this.prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take,
      select: {
        id: true,
        senderId: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
    });

    const modMap = await this.moderation.publicSummaryForUsers(items.map((m) => m.senderId));

    return {
      messages: items.map((m) => ({
        ...m,
        readAt: m.readAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        senderModeration: modMap.get(m.senderId),
      })),
    };
  }

  async markRead(conversationId: string, viewerId: string) {
    await this.assertParticipant(conversationId, viewerId);
    await this.prisma.directMessage.updateMany({
      where: { conversationId, senderId: { not: viewerId }, readAt: null },
      data: { readAt: new Date() },
    });
    await this.prisma.userNotification.updateMany({
      where: {
        userId: viewerId,
        type: 'DIRECT_MESSAGE',
        conversationId,
        read: false,
      },
      data: { read: true },
    });
    return { ok: true };
  }

  async listConversations(userId: string) {
    const rows = await this.prisma.directConversation.findMany({
      where: { OR: [{ userLowId: userId }, { userHighId: userId }] },
      include: {
        userLow: { select: { id: true, profile: this.miniProfileSelect() } },
        userHigh: { select: { id: true, profile: this.miniProfileSelect() } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            body: true,
            createdAt: true,
            senderId: true,
            readAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const peerIds = rows.map((c) => this.peerFromConv(c, userId).id);
    const peerMod = await this.moderation.publicSummaryForUsers(peerIds);

    const out: ConversationListRow[] = [];
    for (const c of rows) {
      const peer = this.peerFromConv(c, userId);
      const last = c.messages[0];
      const unread = await this.prisma.directMessage.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          readAt: null,
        },
      });
      const pprof = peer.profile as {
        displayName: string;
        avatarUrl: string | null;
        city: string;
        country: { nameRu: string };
      } | null;
      out.push({
        id: c.id,
        peer: {
          id: peer.id,
          displayName: pprof?.displayName ?? '?',
          avatarUrl: pprof?.avatarUrl ?? null,
          city: pprof?.city ?? '',
          country: pprof?.country ?? { nameRu: '' },
          moderation: peerMod.get(peer.id),
        },
        lastMessage: last
          ? {
              bodyPreview: previewBody(last.body, 240),
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId,
              readAt: last.readAt?.toISOString() ?? null,
            }
          : null,
        unreadCount: unread,
        updatedAt: c.updatedAt.toISOString(),
      });
    }

    return { conversations: out };
  }

  async unreadTotal(userId: string) {
    const convs = await this.prisma.directConversation.findMany({
      where: { OR: [{ userLowId: userId }, { userHighId: userId }] },
      select: { id: true },
    });

    let n = 0;
    for (const c of convs) {
      n += await this.prisma.directMessage.count({
        where: { conversationId: c.id, senderId: { not: userId }, readAt: null },
      });
    }

    return { unreadCount: n };
  }
}
