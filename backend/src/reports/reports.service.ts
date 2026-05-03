import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ReportTargetType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertDmParticipant(convId: string, userId: string) {
    const c = await this.prisma.directConversation.findUnique({
      where: { id: convId },
      select: { userLowId: true, userHighId: true },
    });
    if (!c) throw new NotFoundException('Диалог не найден');
    if (c.userLowId !== userId && c.userHighId !== userId) {
      throw new ForbiddenException('Нет доступа к этому диалогу');
    }
  }

  async create(reporterId: string, dto: CreateReportDto) {
    const reason = dto.reason.trim();
    if (reason.length < 3 || reason.length > 2000) {
      throw new BadRequestException('Текст жалобы от 3 до 2000 символов');
    }

    const data = {
      reporterId,
      targetType: dto.targetType,
      reason,
      threadId: null as string | null,
      postId: null as string | null,
      reportedUserId: null as string | null,
      directMessageId: null as string | null,
      articleId: null as string | null,
      articleCommentId: null as string | null,
      vetEventCommentId: null as string | null,
      listingMessageId: null as string | null,
      lobbyMessageId: null as string | null,
    };

    switch (dto.targetType) {
      case ReportTargetType.THREAD: {
        const id = dto.threadId;
        if (!id) throw new BadRequestException('Укажите threadId');
        const t = await this.prisma.forumThread.findUnique({ where: { id } });
        if (!t) throw new NotFoundException('Тема не найдена');
        data.threadId = id;
        break;
      }
      case ReportTargetType.POST: {
        const id = dto.postId;
        if (!id) throw new BadRequestException('Укажите postId');
        const p = await this.prisma.forumPost.findUnique({ where: { id } });
        if (!p) throw new NotFoundException('Сообщение не найдено');
        data.postId = id;
        break;
      }
      case ReportTargetType.USER: {
        const id = dto.reportedUserId;
        if (!id) throw new BadRequestException('Укажите reportedUserId');
        if (id === reporterId) {
          throw new BadRequestException('Нельзя пожаловаться на свой профиль');
        }
        const u = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
        if (!u) throw new NotFoundException('Пользователь не найден');
        data.reportedUserId = id;
        break;
      }
      case ReportTargetType.DIRECT_MESSAGE: {
        const id = dto.directMessageId;
        if (!id) throw new BadRequestException('Укажите directMessageId');
        const m = await this.prisma.directMessage.findUnique({
          where: { id },
          select: { id: true, conversationId: true },
        });
        if (!m) throw new NotFoundException('Сообщение не найдено');
        await this.assertDmParticipant(m.conversationId, reporterId);
        data.directMessageId = id;
        break;
      }
      case ReportTargetType.ARTICLE: {
        const id = dto.articleId;
        if (!id) throw new BadRequestException('Укажите articleId');
        const a = await this.prisma.article.findUnique({ where: { id }, select: { id: true } });
        if (!a) throw new NotFoundException('Статья не найдена');
        data.articleId = id;
        break;
      }
      case ReportTargetType.ARTICLE_COMMENT: {
        const id = dto.articleCommentId;
        if (!id) throw new BadRequestException('Укажите articleCommentId');
        const row = await this.prisma.articleComment.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Комментарий не найден');
        data.articleCommentId = id;
        break;
      }
      case ReportTargetType.VET_EVENT_COMMENT: {
        const id = dto.vetEventCommentId;
        if (!id) throw new BadRequestException('Укажите vetEventCommentId');
        const row = await this.prisma.vetEventComment.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Комментарий к мероприятию не найден');
        data.vetEventCommentId = id;
        break;
      }
      case ReportTargetType.LISTING_MESSAGE: {
        const id = dto.listingMessageId;
        if (!id) throw new BadRequestException('Укажите listingMessageId');
        const row = await this.prisma.listingMessage.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Комментарий к объявлению не найден');
        data.listingMessageId = id;
        break;
      }
      case ReportTargetType.LOBBY_MESSAGE: {
        const id = dto.lobbyMessageId;
        if (!id) throw new BadRequestException('Укажите lobbyMessageId');
        const row = await this.prisma.lobbyMessage.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!row) throw new NotFoundException('Сообщение в чате не найдено');
        data.lobbyMessageId = id;
        break;
      }
      default: {
        throw new BadRequestException('Неизвестный тип жалобы');
      }
    }

    return this.prisma.report.create({ data });
  }

  async list(role: UserRole) {
    if (role !== UserRole.MODERATOR && role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        reporter: { select: { id: true, email: true } },
        reportedUser: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
        thread: { select: { id: true, title: true } },
        post: { select: { id: true, body: true, thread: { select: { id: true, title: true } } } },
        directMessage: {
          select: {
            id: true,
            body: true,
            conversationId: true,
            senderId: true,
            sender: {
              select: { id: true, email: true, profile: { select: { displayName: true } } },
            },
          },
        },
        article: { select: { id: true, title: true, authorId: true } },
        articleComment: {
          select: {
            id: true,
            body: true,
            articleId: true,
            article: { select: { id: true, title: true } },
            author: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          },
        },
        vetEventComment: {
          select: {
            id: true,
            body: true,
            vetEventId: true,
            vetEvent: { select: { id: true, title: true } },
            author: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          },
        },
        listingMessage: {
          select: {
            id: true,
            body: true,
            listingId: true,
            senderId: true,
            listing: { select: { id: true, title: true } },
            sender: {
              select: { id: true, email: true, profile: { select: { displayName: true } } },
            },
          },
        },
        lobbyMessage: {
          select: {
            id: true,
            body: true,
            userId: true,
            user: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
          },
        },
      },
    });
  }

  async updateStatus(id: string, role: UserRole, status: string) {
    if (role !== UserRole.MODERATOR && role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    return this.prisma.report.update({
      where: { id },
      data: { status },
    });
  }
}
