import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ModerationService } from '../moderation/moderation.service';

const ARTICLE_COMMENT = 'ARTICLE_COMMENT';

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

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  categories() {
    return this.prisma.articleCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async list(q?: string, categorySlug?: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const where: any = { published: true };
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
      where: { id, published: true },
      include: {
        category: true,
        author: { select: { id: true, email: true, profile: { include: { country: true, jobTitle: true } } } },
      },
    });
    if (!a) throw new NotFoundException();
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
      },
      include: { category: true },
    });
  }

  async commentsForArticle(articleId: string) {
    const article = await this.prisma.article.findFirst({
      where: { id: articleId, published: true },
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
    return rows.map((c) => ({
      ...c,
      authorModeration: modMap.get(c.authorId),
    }));
  }

  async addComment(articleId: string, userId: string, body: string) {
    const article = await this.prisma.article.findFirst({
      where: { id: articleId, published: true },
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

    const text = body.trim();
    if (!text) throw new BadRequestException('Пустой комментарий');

    const created = await this.prisma.articleComment.create({
      data: { articleId, authorId: userId, body: text },
      include: {
        author: { select: { id: true, email: true, profile: true } },
      },
    });

    const modMap = await this.moderation.publicSummaryForUsers([userId]);

    // Уведомления: всем участникам обсуждения (автор + все, кто комментировал), кроме автора текущего комментария.
    try {
      const commenterProfile = await this.prisma.profile.findUnique({
        where: { userId },
        select: { displayName: true },
      });
      const who = commenterProfile?.displayName?.trim() || 'Участник';
      const title = `Комментарий к «${truncateArticleNotifyTitle(article.title)}»`;
      const bodyLine = `${who}: ${excerptForNotification(text, 220)}`;

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

    return {
      ...created,
      authorModeration: modMap.get(userId),
    };
  }
}
