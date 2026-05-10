import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ArticleModerationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

/** Публичный каталог и страница статьи: только опубликованные и не отклонённые / не на очереди. */
function publishedArticleWhere() {
  return {
    published: true,
    moderationStatus: { in: [ArticleModerationStatus.NONE, ArticleModerationStatus.APPROVED] },
  };
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

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
    private readonly uploadsConfig: UploadsConfigService,
  ) {}

  categories() {
    return this.prisma.articleCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async list(q?: string, categorySlug?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where: Record<string, unknown> = { ...publishedArticleWhere() };
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
    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          category: true,
          author: { select: { id: true, email: true, profile: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async byId(id: string) {
    const a = await this.prisma.article.findFirst({
      where: { id, ...publishedArticleWhere() },
      include: {
        category: true,
        author: { select: { id: true, email: true, profile: { include: { country: true, jobTitle: true } } } },
      },
    });
    if (!a) throw new NotFoundException();
    return a;
  }

  /** Автор статьи, админ или модератор — просмотр до публикации. */
  async previewById(id: string, userId: string, role: UserRole) {
    const a = await this.prisma.article.findUnique({
      where: { id },
      include: {
        category: true,
        author: { select: { id: true, email: true, profile: { include: { country: true, jobTitle: true } } } },
      },
    });
    if (!a) throw new NotFoundException();
    const staff = role === UserRole.ADMIN || role === UserRole.MODERATOR;
    if (!staff && a.authorId !== userId) throw new ForbiddenException();
    return a;
  }

  create(userId: string, dto: CreateArticleDto) {
    return this.prisma.article.create({
      data: {
        authorId: userId,
        categoryId: dto.categoryId,
        title: dto.title,
        excerpt: dto.excerpt,
        body: dto.body,
        published: dto.published ?? true,
        moderationStatus: ArticleModerationStatus.NONE,
        attachmentUrls: [],
      },
      include: { category: true },
    });
  }

  async submitArticle(userId: string, role: UserRole, dto: SubmitArticleDto) {
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
    const where =
      status === 'pending'
        ? { authorId: userId, moderationStatus: ArticleModerationStatus.PENDING }
        : { authorId: userId };
    return this.prisma.article.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        category: true,
        author: { select: { id: true, email: true, profile: true } },
      },
    });
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
    const article = await this.prisma.article.findFirst({
      where: { id: articleId, ...publishedArticleWhere() },
      select: { id: true },
    });
    if (!article) throw new NotFoundException();
    const rows = await this.prisma.articleComment.findMany({
      where: { articleId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, email: true, profile: true } },
      },
    });

    const modMap = await this.moderation.publicSummaryForUsers(rows.map((c) => c.authorId));
    return rows.map((c) => this.serializeCommentRow(c, modMap));
  }

  async addComment(articleId: string, userId: string, dto: CreateArticleCommentDto) {
    const article = await this.prisma.article.findFirst({
      where: { id: articleId, ...publishedArticleWhere() },
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
    const bodyStored = text;
    const approxLen = bodyStored.length + urls.join('\n').length;
    if (approxLen > 12000) {
      throw new BadRequestException('Комментарий с вложениями слишком длинный');
    }

    const created = await this.prisma.articleComment.create({
      data: { articleId, authorId: userId, body: bodyStored, attachmentUrls: urls },
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

    return this.serializeCommentRow(created, modMap);
  }

  async patchComment(commentId: string, userId: string, dto: PatchArticleCommentDto) {
    const row = await this.prisma.articleComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        articleId: true,
        authorId: true,
        body: true,
        attachmentUrls: true,
      },
    });
    if (!row) throw new NotFoundException();
    if (row.authorId !== userId) throw new ForbiddenException();

    const article = await this.prisma.article.findFirst({
      where: { id: row.articleId, ...publishedArticleWhere() },
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
    const cur = splitCommentBodyFromStorage(row.body, row.attachmentUrls ?? []);

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

    const updated = await this.prisma.articleComment.update({
      where: { id: commentId },
      data: { body: nextText, attachmentUrls: nextUrls },
      include: {
        author: { select: { id: true, email: true, profile: true } },
      },
    });

    const modMap = await this.moderation.publicSummaryForUsers([userId]);
    return this.serializeCommentRow(updated, modMap);
  }

  async deleteComment(commentId: string, userId: string) {
    const row = await this.prisma.articleComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, articleId: true },
    });
    if (!row) throw new NotFoundException();
    if (row.authorId !== userId) throw new ForbiddenException();

    const article = await this.prisma.article.findFirst({
      where: { id: row.articleId, ...publishedArticleWhere() },
      select: { id: true },
    });
    if (!article) throw new NotFoundException();

    await this.prisma.articleComment.delete({ where: { id: commentId } });
    return { ok: true };
  }
}
