import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ListingType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { VetcoinService } from '../vetcoin/vetcoin.service';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vetcoin: VetcoinService,
    private readonly moderation: ModerationService,
  ) {}

  async list(type?: ListingType, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    /** В общей ленте маркетплейса — только активные объявления (без совершённой сделки). */
    const where: { buyerId: null; type?: ListingType } = { buyerId: null };
    if (type) where.type = type;
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          author: { select: { id: true, email: true, profile: { include: { country: true } } } },
          buyer: { select: { id: true, email: true, profile: { include: { country: true } } } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async byId(id: string) {
    const l = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, email: true, profile: { include: { country: true, jobTitle: true } } } },
        buyer: { select: { id: true, email: true, profile: { include: { country: true, jobTitle: true } } } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, email: true, profile: true } },
          },
        },
      },
    });
    if (!l) throw new NotFoundException();

    const senderIds = Array.from(new Set(l.messages.map((m) => m.senderId)));
    const modMap = await this.moderation.publicSummaryForUsers(senderIds);

    const authorMod = await this.moderation.publicSummaryForUsers([l.authorId]);
    const buyerMod = l.buyerId ? await this.moderation.publicSummaryForUsers([l.buyerId]) : new Map();

    return {
      ...l,
      authorModeration: authorMod.get(l.authorId),
      buyerModeration: l.buyerId ? buyerMod.get(l.buyerId) : null,
      messages: l.messages.map((m) => ({
        ...m,
        senderModeration: modMap.get(m.senderId),
      })),
    };
  }

  private listingFee(type: ListingType): number {
    switch (type) {
      case ListingType.SELL:
        return 30;
      case ListingType.BUY:
        return 25;
      case ListingType.JOB:
        return 20;
      default:
        return 0;
    }
  }

  private sanitizeListingImageUrls(raw?: string[]): string[] {
    const urls = (raw ?? []).map((u) => u.trim()).filter(Boolean);
    if (urls.length === 0) return [];
    if (urls.length > 8) throw new BadRequestException('Можно прикрепить не более 8 изображений.');
    for (const u of urls) {
      if (
        !/^\/uploads\/listings\/[a-zA-Z0-9._-]+\.(jpe?g|png|webp|gif)$/i.test(u) ||
        u.length > 500
      ) {
        throw new BadRequestException(
          'Изображения объявления: используйте URL из POST /api/uploads/listing-image или удалите некорректные ссылки.',
        );
      }
    }
    // дедуп, сохранить порядок
    const seen = new Set<string>();
    return urls.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
  }

  async create(userId: string, dto: CreateListingDto) {
    await this.moderation.maybeClearExpiredSanctions(userId);

    const fee = this.listingFee(dto.type);
    const imageUrls = this.sanitizeListingImageUrls(dto.imageUrls);
    const reason =
      dto.type === ListingType.SELL
        ? 'Публикация объявления (продажа)'
        : dto.type === ListingType.BUY
          ? 'Публикация объявления (куплю)'
          : 'Публикация объявления (вакансия / услуги)';
    return this.prisma.$transaction(async (tx) => {
      if (fee > 0) {
        const modRow = await tx.user.findUnique({
          where: { id: userId },
          select: { moderationStatus: true, moderationUntil: true, role: true },
        });
        if (modRow) {
          this.moderation.assertCanSpendVetcoin(modRow.role, modRow);
        }

        await this.vetcoin.applyDeltaInTransaction(tx, userId, -fee, reason);
      }
      return tx.listing.create({
        data: {
          type: dto.type,
          authorId: userId,
          title: dto.title,
          description: dto.description,
          region: dto.region,
          imageUrls,
        },
        include: { author: { select: { id: true, profile: true } } },
      });
    });
  }

  async addMessage(listingId: string, senderId: string, body: string) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException();
    if (listing.buyerId) {
      throw new ForbiddenException(
        'Сделка по объявлению завершена: новые комментарии недоступны.',
      );
    }
    if (listing.authorId !== senderId) {
      // любой авторизованный может писать в чат по объявлению (отклик)
    }
    const created = await this.prisma.listingMessage.create({
      data: { listingId, senderId, body },
      include: { sender: { select: { id: true, profile: true } } },
    });

    // Уведомления: всем участникам обсуждения объявления (автор + все отправители), кроме автора текущего сообщения.
    try {
      const senderProf = await this.prisma.profile.findUnique({
        where: { userId: senderId },
        select: { displayName: true },
      });
      const who = senderProf?.displayName?.trim() || 'Участник';
      const excerpt = (body || '').replace(/\s+/g, ' ').trim().slice(0, 220);
      const text = excerpt.length === 220 ? `${excerpt}…` : excerpt;

      const senders = await this.prisma.listingMessage.findMany({
        where: { listingId },
        select: { senderId: true },
        distinct: ['senderId'],
      });
      const targets = new Set<string>([listing.authorId, ...senders.map((s) => s.senderId)]);
      targets.delete(senderId);

      const data = [...targets].map((uid) => ({
        userId: uid,
        type: 'LISTING_MESSAGE',
        listingId,
        actorUserId: senderId,
        title: 'Новое сообщение по объявлению',
        body: `${who}: ${text || 'сообщение'}`,
      }));
      if (data.length > 0) {
        await this.prisma.userNotification.createMany({ data });
      }
    } catch {
      /* уведомления не критичны */
    }

    const modMap = await this.moderation.publicSummaryForUsers([senderId]);

    return {
      ...created,
      senderModeration: modMap.get(senderId),
    };
  }

  /**
   * Автор объявления указывает покупателя среди пользователей, оставивших комментарий.
   * После сохранения комментарии к объявлению закрыты.
   */
  async markSold(listingId: string, sellerId: string, buyerUserId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        authorId: true,
        buyerId: true,
        messages: { select: { senderId: true } },
      },
    });
    if (!listing) throw new NotFoundException();
    if (listing.authorId !== sellerId) {
      throw new ForbiddenException('Подтвердить сделку может только автор объявления.');
    }
    if (listing.buyerId) {
      throw new BadRequestException('Объявление уже отмечено как закрытое после сделки.');
    }
    const buyerIdTrim = buyerUserId.trim();
    if (!buyerIdTrim || buyerIdTrim === listing.authorId) {
      throw new BadRequestException('Нельзя выбрать автора объявления в качестве покупателя.');
    }

    const commenterIds = new Set(
      listing.messages.map((m) => m.senderId).filter((id) => id && id !== listing.authorId),
    );
    if (!commenterIds.has(buyerIdTrim)) {
      throw new BadRequestException(
        'Покупателем можно назначить только пользователя из списка комментаторов под объявлением (кроме вас самих).',
      );
    }

    await this.prisma.listing.update({
      where: { id: listingId },
      data: { buyerId: buyerIdTrim },
    });

    return this.byId(listingId);
  }
}
