import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArticleModerationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  prismaArticleCommentHasAttachmentColumn,
  prismaArticleHasModerationColumn,
} from '../common/prisma-article-schema';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateArticleCommentDto } from './dto/create-article-comment.dto';
import { PatchArticleCommentDto } from './dto/patch-article-comment.dto';
import { PatchSubmitArticleDto } from './dto/patch-submit-article.dto';
import { SubmitArticleDto } from './dto/submit-article.dto';
import { ModerationService } from '../moderation/moderation.service';
import { UploadsConfigService } from '../uploads/uploads-config.service';
import {
  sanitizeArticleCommentAttachmentUrls,
  sanitizeArticleSubmissionAttachmentUrls,
  isMessageAttachmentLine,
} from '../uploads/message-attachments.policy';

const ARTICLE_COMMENT = 'ARTICLE_COMMENT';
const ARTICLE_PENDING = 'ARTICLE_PENDING';

function excerptForNotification(raw: string, max = 220): string {
  const t = (raw || '').replace(/\s+/g, ' ').trim();
  if (!t.length) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function truncateArticleNotifyTitle(title: string, max = 72): string {
  const t = (title || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function splitCommentBodyFromStorage(body: string, dbUrls: string[]): { text: string; urls: string[] } {
  const lines = (body ?? '').replace(/\r\n/g, '\n').split('\n');
  const fromBody: string[] = [];
  const textLines: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t && isMessageAttachmentLine(t)) fromBody.push(t);
    else textLines.push(line);
  }
  const urls = dbUrls && dbUrls.length > 0 ? [...dbUrls] : fromBody;
  const text = textLines.join('\n').trimEnd();
  return { text, urls };
}

function normalizeArticleRow<T extends Record<string, unknown>>(row: T, hasMod: boolean): T & { moderationStatus: string; attachmentUrls: string[] } {
  return {
    ...row,
    moderationStatus: hasMod
      ? String(row.moderationStatus ?? ArticleModerationStatus.NONE)
      : ArticleModerationStatus.NONE,
    attachmentUrls: Array.isArray(row.attachmentUrls) ? (row.attachmentUrls as string[]) : [],
  };
}

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
    private readonly uploadsConfig: UploadsConfigService,
  ) {}

  private async publishedArticleWhere(): Promise<Record<string, unknown>> {
    if (await prismaArticleHasModerationColumn(this.prisma)) {
      return {
        published: true,
        moderationStatus: { in: [ArticleModerationStatus.NONE, ArticleModerationStatus.APPROVED] },
      };
    }
    return { published: true };
  }

  private authorSelectList() {
    return { select: { id: true, email: true, profile: true } } as const;
  }

  private authorSelectDetail() {
    return {
      select: { id: true, email: true, profile: { include: { country: true, jobTitle: true } } },
    } as const;
  }

  categories() {
    return this.prisma.articleCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async list(q?: string, categorySlug?: string, page = 1, pageSize = 20) {
    const hasMod = await prismaArticleHasModerationColumn(this.prisma);
    const skip = (page - 1) * pageSize;
    const pub = await this.publishedArticleWhere();
    const where: Record<string, unknown> = { ...pub };
    if (categorySlug) {
      const cat = await this.prisma.articleCategory.findUnique({ where: { slug: categorySlug } });
      if (cat) where.categoryId = cat.id;
    }
    if (q && q.trim().length >= 2) {
      const needle = q.trim();
      where.OR = [
        { title: { contains: needle, mode: 'insensitive' } },
        { excerpt: { contains: needle, mode: 'insensitive' } },
      ];
    }

    const selectList = hasMod
      ? ({
          id: true,
          title: true,
          excerpt: true,
          published: true,
          createdAt: true,
          moderationStatus: true,
          attachmentUrls: true,
          categoryId: true,
          authorId: true,
          category: true,
          author: this.authorSelectList(),
        } as const)
      : ({
          id: true,
          title: true,
          excerpt: true,
          published: true,
          createdAt: true,
          categoryId: true,
          authorId: true,
          category: true,
          author: this.authorSelectList(),
        } as const);

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where: where as never,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: selectList as never,
      }),
      this.prisma.article.count({ where: where as never }),
    ]);

    return {
      items: items.map((row) => normalizeArticleRow(row as Record<string, unknown>, hasMod)),
      total,
      page,
      pageSize,
    };
  }

  async byId(id: string) {
    const hasMod = await prismaArticleHasModerationColumn(this.prisma);
    const pub = await this.publishedArticleWhere();
    const selectDetail = hasMod
      ? ({
          id: true,
          categoryId: true,
          authorId: true,
          title: true,
          excerpt: true,
          body: true,
          published: true,
          createdAt: true,
          moderationStatus: true,
          attachmentUrls: true,
          category: true,
          author: this.authorSelectDetail(),
        } as const)
      : ({
          id: true,
          categoryId: true,
          authorId: true,
          title: true,
          excerpt: true,
          body: true,
          published: true,
          createdAt: true,
          category: true,
          author: this.authorSelectDetail(),
        } as const);

    const a = await this.prisma.article.findFirst({
      where: { id, ...(pub as object) } as never,
      select: selectDetail as never,
    });
    if (!a) throw new NotFoundException();
    return normalizeArticleRow(a as Record<string, unknown>, hasMod);
  }

  /** Автор статьи, админ или модератор — просмотр до публикации. */
  async previewById(id: string, userId: string, role: UserRole) {
    const hasMod = await prismaArticleHasModerationColumn(this.prisma);
    const selectDetail = hasMod
      ? ({
          id: true,
          categoryId: true,
          authorId: true,
          title: true,
          excerpt: true,
          body: true,
          published: true,
          createdAt: true,
          moderationStatus: true,
          attachmentUrls: true,
          category: true,
          author: this.authorSelectDetail(),
        } as const)
      : ({
          id: true,
          categoryId: true,
          authorId: true,
          title: true,
          excerpt: true,
          body: true,
          published: true,
          createdAt: true,
          category: true,
          author: this.authorSelectDetail(),
        } as const);

    const a = await this.prisma.article.findUnique({
      where: { id },
      select: selectDetail as never,
    });
    if (!a) throw new NotFoundException();
    const staff = role === UserRole.ADMIN || role === UserRole.MODERATOR;
    const preview = a as { authorId: string };
    if (!staff && preview.authorId !== userId) throw new ForbiddenException();
    return normalizeArticleRow(a as Record<string, unknown>, hasMod);
  }

  async create(userId: string, dto: CreateArticleDto) {
    const hasMod = await prismaArticleHasModerationColumn(this.prisma);
    const published = dto.published ?? true;
    if (hasMod) {
      return this.prisma.article.create({
        data: {
          authorId: userId,
          categoryId: dto.categoryId,
          title: dto.title,
          excerpt: dto.excerpt,
          body: dto.body,
          published,
          moderationStatus: ArticleModerationStatus.NONE,
          attachmentUrls: [],
        },
        include: { category: true },
      });
    }
    return this.prisma.article.create({
      data: {
        authorId: userId,
        categoryId: dto.categoryId,
        title: dto.title,
        excerpt: dto.excerpt,
        body: dto.body,
        published,
      },
      include: { category: true },
    });
  }

  async submitArticle(userId: string, role: UserRole, dto: SubmitArticleDto) {
    if (!(await prismaArticleHasModerationColumn(this.prisma))) {
      throw new BadRequestException(
        'На сервере не применена миграция статей (moderationStatus). Выполните `npx prisma migrate deploy` и перезапустите API.',
      );
    }
    if (role !== UserRole.SPECIALIST && role !== UserRole.MODERATOR) {
      throw new ForbiddenException('Публикация статей доступна специалистам.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      throw new ForbiddenException('Подтвердите email перед отправкой статьи на модерацию.');
    }
    const cat = await this.prisma.articleCategory.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new BadRequestException('Категория не найдена');

    const maxFiles = 15;
    const filesEnabled = await this.uploadsConfig.messageAttachmentsEnabled();
    const rawUrls = filesEnabled
      ? (dto.attachmentUrls ?? [])
      : (dto.attachmentUrls ?? []).filter((u) => typeof u === 'string' && !isMessageAttachmentLine(u));
    const urls = sanitizeArticleSubmissionAttachmentUrls(rawUrls, maxFiles);

    const created = await this.prisma.article.create({
      data: {
        authorId: userId,
        categoryId: dto.categoryId,
        title: dto.title.trim(),
        excerpt: dto.excerpt.trim(),
        body: dto.body.trim(),
        published: false,
        moderationStatus: ArticleModerationStatus.PENDING,
        attachmentUrls: urls,
      },
      include: {
        category: true,
        author: { select: { id: true, email: true, profile: true } },
      },
    });

    await this.notifyAdminsArticlePending(created.id, created.title, userId);

    return created;
  }

  async patchPendingSubmission(userId: string, articleId: string, dto: PatchSubmitArticleDto) {
    if (!(await prismaArticleHasModerationColumn(this.prisma))) {
      throw new BadRequestException('Миграция статей не применена — черновики на модерации недоступны.');
    }
    const a = await this.prisma.article.findFirst({
      where: { id: articleId, authorId: userId, moderationStatus: ArticleModerationStatus.PENDING },
    });
    if (!a) throw new NotFoundException();

    const maxFiles = 15;
    const filesEnabled = await this.uploadsConfig.messageAttachmentsEnabled();
    const rawUrls =
      dto.attachmentUrls !== undefined
        ? filesEnabled
          ? dto.attachmentUrls
          : dto.attachmentUrls.filter((u) => typeof u === 'string' && !isMessageAttachmentLine(u))
        : undefined;
    const urls =
      rawUrls !== undefined ? sanitizeArticleSubmissionAttachmentUrls(rawUrls, maxFiles) : undefined;

    const catId = dto.categoryId;
    if (catId) {
      const cat = await this.prisma.articleCategory.findUnique({ where: { id: catId } });
      if (!cat) throw new BadRequestException('Категория не найдена');
    }

    return this.prisma.article.update({
      where: { id: articleId },
      data: {
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt.trim() } : {}),
        ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
        ...(urls !== undefined ? { attachmentUrls: urls } : {}),
      },
      include: {
        category: true,
        author: { select: { id: true, email: true, profile: true } },
      },
    });
  }

  async mySubmissions(userId: string, status?: 'pending' | 'all') {
    const hasMod = await prismaArticleHasModerationColumn(this.prisma);
    const where =
      status === 'pending' && hasMod
        ? { authorId: userId, moderationStatus: ArticleModerationStatus.PENDING }
        : { authorId: userId };
    const selectRows = hasMod
      ? ({
          id: true,
          title: true,
          excerpt: true,
          body: true,
          published: true,
          createdAt: true,
          moderationStatus: true,
          attachmentUrls: true,
          categoryId: true,
          authorId: true,
          category: true,
          author: { select: { id: true, email: true, profile: true } },
        } as const)
      : ({
          id: true,
          title: true,
          excerpt: true,
          body: true,
          published: true,
          createdAt: true,
          categoryId: true,
          authorId: true,
          category: true,
          author: { select: { id: true, email: true, profile: true } },
        } as const);

    const rows = await this.prisma.article.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: selectRows as never,
    });
    return rows.map((row) => normalizeArticleRow(row as Record<string, unknown>, hasMod));
  }

  private async notifyAdminsArticlePending(articleId: string, title: string, actorUserId: string) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { id: true },
      });
      if (admins.length === 0) return;
      const t = truncateArticleNotifyTitle(title);
      await this.prisma.userNotification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: ARTICLE_PENDING,
          articleId,
          actorUserId,
          title: 'Статья на модерации',
          body: `Новая заявка: «${t}». Откройте раздел админки «Статьи» → очередь модерации.`,
        })),
      });
    } catch {
      /* не критично */
    }
  }

  private serializeCommentRow(
    row: {
      id: string;
      articleId: string;
      body: string;
      attachmentUrls: string[];
      createdAt: Date;
      updatedAt: Date;
      authorId: string;
      author: { id: string; email: string; profile: unknown };
    },
    modMap: Map<string, unknown>,
  ) {
    const split = splitCommentBodyFromStorage(row.body, row.attachmentUrls ?? []);
    return {
      id: row.id,
      articleId: row.articleId,
      body: split.text,
      attachmentUrls: split.urls,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: row.author,
      authorModeration: modMap.get(row.authorId),
    };
  }

  async commentsForArticle(articleId: string) {
    const pub = await this.publishedArticleWhere();
    const article = await this.prisma.article.findFirst({
      where: { id: articleId, ...(pub as object) } as never,
      select: { id: true },
    });
    if (!article) throw new NotFoundException();

    const hasCom = await prismaArticleCommentHasAttachmentColumn(this.prisma);
    const rows = hasCom
      ? await this.prisma.articleComment.findMany({
          where: { articleId },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, email: true, profile: true } },
          },
        })
      : await this.prisma.articleComment.findMany({
          where: { articleId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            articleId: true,
            authorId: true,
            body: true,
            createdAt: true,
            author: { select: { id: true, email: true, profile: true } },
          },
        });

    const modMap = await this.moderation.publicSummaryForUsers(rows.map((c) => (c as { authorId: string }).authorId));

    return rows.map((c) => {
      const base = c as {
        id: string;
        articleId: string;
        authorId: string;
        body: string;
        createdAt: Date;
        attachmentUrls?: string[];
        updatedAt?: Date;
        author: { id: string; email: string; profile: unknown };
      };
      const normalized = {
        ...base,
        attachmentUrls: base.attachmentUrls ?? [],
        updatedAt: base.updatedAt ?? base.createdAt,
      };
      return this.serializeCommentRow(normalized, modMap);
    });
  }

  async addComment(articleId: string, userId: string, dto: CreateArticleCommentDto) {
    const pub = await this.publishedArticleWhere();
    const article = await this.prisma.article.findFirst({
      where: { id: articleId, ...(pub as object) } as never,
      select: { id: true, authorId: true, title: true },
    });
    if (!article) throw new NotFoundException();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      throw new ForbiddenException('Подтвердите email, чтобы оставлять комментарии.');
    }

    const maxFiles = await this.uploadsConfig.messageMaxFilesPerComment();
    const filesEnabled = await this.uploadsConfig.messageAttachmentsEnabled();
    const rawUrls = filesEnabled
      ? (dto.attachmentUrls ?? [])
      : (dto.attachmentUrls ?? []).filter((u) => typeof u === 'string' && !isMessageAttachmentLine(u));
    const urls = sanitizeArticleCommentAttachmentUrls(rawUrls, maxFiles);
    const text = (dto.body ?? '').trim();
    if (!text && urls.length === 0) {
      throw new BadRequestException('Введите текст комментария или прикрепите файл');
    }

    const hasCom = await prismaArticleCommentHasAttachmentColumn(this.prisma);
    const bodyLegacy =
      urls.length === 0 ? text : text ? `${text}\n\n${urls.join('\n')}` : urls.join('\n');
    if (bodyLegacy.length > 12000) {
      throw new BadRequestException('Комментарий с вложениями слишком длинный');
    }

    const created = hasCom
      ? await this.prisma.articleComment.create({
          data: { articleId, authorId: userId, body: text, attachmentUrls: urls },
          include: {
            author: { select: { id: true, email: true, profile: true } },
          },
        })
      : await this.prisma.articleComment.create({
          data: { articleId, authorId: userId, body: bodyLegacy },
          include: {
            author: { select: { id: true, email: true, profile: true } },
          },
        });

    const modMap = await this.moderation.publicSummaryForUsers([userId]);

    try {
      const commenterProfile = await this.prisma.profile.findUnique({
        where: { userId },
        select: { displayName: true },
      });
      const who = commenterProfile?.displayName?.trim() || 'Участник';
      const title = `Комментарий к «${truncateArticleNotifyTitle(article.title)}»`;
      const bodyLine = `${who}: ${excerptForNotification(text || urls.join(' '), 220)}`;

      const commenters = await this.prisma.articleComment.findMany({
        where: { articleId: article.id },
        select: { authorId: true },
        distinct: ['authorId'],
      });
      const targets = new Set<string>([article.authorId, ...commenters.map((c) => c.authorId)]);
      targets.delete(userId);

      const data = [...targets].map((uid) => ({
        userId: uid,
        type: ARTICLE_COMMENT,
        articleId: article.id,
        actorUserId: userId,
        title,
        body: bodyLine,
      }));
      if (data.length > 0) {
        await this.prisma.userNotification.createMany({ data });
      }
    } catch {
      /* уведомления не критичны */
    }

    const row = hasCom
      ? created
      : {
          ...created,
          attachmentUrls: [] as string[],
          updatedAt: created.createdAt,
        };
    return this.serializeCommentRow(
      {
        id: row.id,
        articleId: row.articleId,
        authorId: row.authorId,
        body: row.body,
        attachmentUrls: (row as { attachmentUrls?: string[] }).attachmentUrls ?? [],
        createdAt: row.createdAt,
        updatedAt: (row as { updatedAt?: Date }).updatedAt ?? row.createdAt,
        author: row.author as { id: string; email: string; profile: unknown },
      },
      modMap,
    );
  }

  async patchComment(commentId: string, userId: string, dto: PatchArticleCommentDto) {
    const hasCom = await prismaArticleCommentHasAttachmentColumn(this.prisma);
    const row = hasCom
      ? await this.prisma.articleComment.findUnique({
          where: { id: commentId },
          select: {
            id: true,
            articleId: true,
            authorId: true,
            body: true,
            attachmentUrls: true,
          },
        })
      : await this.prisma.articleComment.findUnique({
          where: { id: commentId },
          select: {
            id: true,
            articleId: true,
            authorId: true,
            body: true,
          },
        });
    if (!row) throw new NotFoundException();
    if (row.authorId !== userId) throw new ForbiddenException();

    const pub = await this.publishedArticleWhere();
    const article = await this.prisma.article.findFirst({
      where: { id: row.articleId, ...(pub as object) } as never,
      select: { id: true },
    });
    if (!article) throw new NotFoundException('Статья недоступна для правки комментария.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!user?.emailVerified) {
      throw new ForbiddenException('Подтвердите email.');
    }

    const maxFiles = await this.uploadsConfig.messageMaxFilesPerComment();
    const filesEnabled = await this.uploadsConfig.messageAttachmentsEnabled();
    const cur = splitCommentBodyFromStorage(
      row.body,
      hasCom && 'attachmentUrls' in row ? (row.attachmentUrls as string[]) ?? [] : [],
    );

    const rawUrls =
      dto.attachmentUrls !== undefined
        ? filesEnabled
          ? dto.attachmentUrls
          : dto.attachmentUrls.filter((u) => typeof u === 'string' && !isMessageAttachmentLine(u))
        : undefined;
    const nextUrls =
      rawUrls !== undefined ? sanitizeArticleCommentAttachmentUrls(rawUrls, maxFiles) : cur.urls;
    const nextText = dto.body !== undefined ? dto.body.trim() : cur.text;

    if (!nextText && nextUrls.length === 0) {
      throw new BadRequestException('Комментарий не может быть пустым');
    }

    const bodyLegacy =
      !hasCom && nextUrls.length > 0
        ? nextText
          ? `${nextText}\n\n${nextUrls.join('\n')}`
          : nextUrls.join('\n')
        : nextText;

    const updated = hasCom
      ? await this.prisma.articleComment.update({
          where: { id: commentId },
          data: { body: nextText, attachmentUrls: nextUrls },
          include: {
            author: { select: { id: true, email: true, profile: true } },
          },
        })
      : await this.prisma.articleComment.update({
          where: { id: commentId },
          data: { body: bodyLegacy },
          include: {
            author: { select: { id: true, email: true, profile: true } },
          },
        });

    const modMap = await this.moderation.publicSummaryForUsers([userId]);
    const uRow = hasCom
      ? updated
      : {
          ...updated,
          attachmentUrls: [] as string[],
          updatedAt: updated.createdAt,
        };
    return this.serializeCommentRow(
      {
        id: uRow.id,
        articleId: uRow.articleId,
        authorId: uRow.authorId,
        body: uRow.body,
        attachmentUrls: (uRow as { attachmentUrls?: string[] }).attachmentUrls ?? [],
        createdAt: uRow.createdAt,
        updatedAt: (uRow as { updatedAt?: Date }).updatedAt ?? uRow.createdAt,
        author: uRow.author as { id: string; email: string; profile: unknown },
      },
      modMap,
    );
  }

  async deleteComment(commentId: string, userId: string) {
    const row = await this.prisma.articleComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, articleId: true },
    });
    if (!row) throw new NotFoundException();
    if (row.authorId !== userId) throw new ForbiddenException();

    const pub = await this.publishedArticleWhere();
    const article = await this.prisma.article.findFirst({
      where: { id: row.articleId, ...(pub as object) } as never,
      select: { id: true },
    });
    if (!article) throw new NotFoundException();

    await this.prisma.articleComment.delete({ where: { id: commentId } });
    return { ok: true };
  }
}
