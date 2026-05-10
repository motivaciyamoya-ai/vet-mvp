import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ArticleModerationStatus, ListingType, Prisma, SosStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { VetcoinService } from '../vetcoin/vetcoin.service';
import { AdminVetcoinAdjustDto } from './dto/admin-vetcoin.dto';
import {
  AdminCreateArticleCategoryDto,
  AdminCreateArticleDto,
  AdminPatchArticleCategoryDto,
  AdminPatchArticleDto,
} from './dto/admin-articles.dto';
import {
  AdminCreateForumCategoryDto,
  AdminPatchForumCategoryDto,
  AdminPatchForumPostDto,
  AdminPatchForumThreadDto,
} from './dto/admin-forum.dto';
import { AdminPatchListingDto } from './dto/admin-listings.dto';
import {
  AdminCreateCountryDto,
  AdminCreateJobTitleDto,
  AdminPatchCountryDto,
  AdminPatchJobTitleDto,
} from './dto/admin-reference.dto';
import { AdminPatchUserDto } from './dto/admin-users.dto';
import { AdminSetUserVetcoinDto } from './dto/admin-users-vetcoin.dto';
import { AdminPatchReportDto } from './dto/admin-misc.dto';
import { ModerationService } from '../moderation/moderation.service';
import { sanitizeArticleSubmissionAttachmentUrls } from '../uploads/message-attachments.policy';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vetcoin: VetcoinService,
    private readonly moderation: ModerationService,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService,
  ) {}

  private paginate(page: number, pageSize: number) {
    const p = Math.max(1, page);
    const ps = Math.min(Math.max(1, pageSize), 100);
    return { skip: (p - 1) * ps, take: ps, page: p, pageSize: ps };
  }

  async stats() {
    const [
      users,
      forumCategories,
      forumThreads,
      forumPosts,
      articles,
      listings,
      reports,
      sosOpen,
      sosTotal,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.forumCategory.count(),
      this.prisma.forumThread.count(),
      this.prisma.forumPost.count(),
      this.prisma.article.count(),
      this.prisma.listing.count(),
      this.prisma.report.count(),
      this.prisma.sosRequest.count({ where: { status: SosStatus.OPEN } }),
      this.prisma.sosRequest.count(),
    ]);
    return {
      users,
      forumCategories,
      forumThreads,
      forumPosts,
      articles,
      listings,
      reports,
      sosOpen,
      sosTotal,
    };
  }

  async usersList(q?: string, page = 1, pageSize = 20) {
    const { skip, take, page: p, pageSize: ps } = this.paginate(page, pageSize);
    const where: Prisma.UserWhereInput = {};
    if (q && q.trim().length >= 1) {
      const needle = q.trim();
      where.OR = [
        { email: { contains: needle, mode: 'insensitive' } },
        { profile: { displayName: { contains: needle, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          profile: { include: { country: true, jobTitle: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: p, pageSize: ps };
  }

  userById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: { include: { country: true, jobTitle: true } },
        _count: {
          select: {
            forumThreads: true,
            forumPosts: true,
            articles: true,
            listings: true,
            sosRequests: true,
          },
        },
      },
    });
  }

  async patchUser(
    id: string,
    dto: AdminPatchUserDto,
    actor: AuthUser,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException();

    const prevRole = user.role;

    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) throw new ConflictException('Email уже занят');
    }

    let passwordHash: string | undefined;
    if (dto.newPassword) {
      passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    if (dto.role !== undefined && dto.role !== prevRole) {
      await this.audit.log({
        action: 'admin.user.role_change',
        actorUserId: actor.id,
        actorEmail: actor.email,
        details: { targetUserId: id, targetEmail: user.email, from: prevRole, to: dto.role },
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
      if (dto.role === UserRole.ADMIN) {
        void this.alerts.notifyRoleAdmin(user.email, actor.email);
      }
    }

    const profilePatch: Prisma.ProfileUpdateInput = {};
    if (dto.displayName !== undefined) profilePatch.displayName = dto.displayName;
    if (dto.city !== undefined) profilePatch.city = dto.city;
    if (dto.countryId !== undefined) profilePatch.country = { connect: { id: dto.countryId } };
    if (dto.jobTitleId !== undefined) profilePatch.jobTitle = { connect: { id: dto.jobTitleId } };
    if (dto.verification !== undefined) profilePatch.verification = dto.verification;
    if (dto.avatarUrl !== undefined) profilePatch.avatarUrl = dto.avatarUrl;

    if (user.profile && Object.keys(profilePatch).length > 0) {
      await this.prisma.profile.update({
        where: { userId: id },
        data: profilePatch,
      });
    }

    return this.userById(id);
  }

  async deleteUser(id: string) {
    try {
      await this.prisma.user.delete({ where: { id } });
      return { ok: true };
    } catch {
      throw new BadRequestException(
        'Не удалось удалить пользователя (есть связанные данные). Удалите контент или переназначьте автора.',
      );
    }
  }

  async forumCategories() {
    const cats = await this.prisma.forumCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { threads: true } } },
    });
    const postRows = await this.prisma.$queryRaw<Array<{ id: string; postCount: bigint }>>`
      SELECT c.id, COUNT(p.id)::bigint AS "postCount"
      FROM "ForumCategory" c
      LEFT JOIN "ForumThread" t ON t."categoryId" = c.id
      LEFT JOIN "ForumPost" p ON p."threadId" = t.id
      GROUP BY c.id
    `;
    const postByCat = new Map(postRows.map((r) => [r.id, Number(r.postCount)]));
    return cats.map((c) => ({
      ...c,
      postCount: postByCat.get(c.id) ?? 0,
    }));
  }

  async createForumCategory(dto: AdminCreateForumCategoryDto) {
    const exists = await this.prisma.forumCategory.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('slug уже занят');
    return this.prisma.forumCategory.create({ data: dto });
  }

  async patchForumCategory(id: string, dto: AdminPatchForumCategoryDto) {
    if (dto.slug) {
      const clash = await this.prisma.forumCategory.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (clash) throw new ConflictException('slug уже занят');
    }
    return this.prisma.forumCategory.update({ where: { id }, data: dto });
  }

  async deleteForumCategory(id: string) {
    const n = await this.prisma.forumThread.count({ where: { categoryId: id } });
    if (n > 0) {
      throw new BadRequestException(`В категории ${n} тем. Сначала удалите или перенесите их.`);
    }
    await this.prisma.forumCategory.delete({ where: { id } });
    return { ok: true };
  }

  async forumThreadsList(q?: string, page = 1, pageSize = 20) {
    const { skip, take, page: p, pageSize: ps } = this.paginate(page, pageSize);
    const where: Prisma.ForumThreadWhereInput = {};
    if (q && q.trim().length >= 2) {
      const needle = q.trim();
      where.OR = [
        { title: { contains: needle, mode: 'insensitive' } },
        { tags: { contains: needle, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          category: true,
          author: { select: { id: true, email: true, profile: true } },
          _count: { select: { posts: true } },
        },
      }),
      this.prisma.forumThread.count({ where }),
    ]);
    return { items, total, page: p, pageSize: ps };
  }

  async forumThreadById(id: string) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id },
      include: {
        category: true,
        author: { select: { id: true, email: true, profile: true } },
        posts: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, email: true } } },
        },
      },
    });
    if (!thread) throw new NotFoundException();
    return thread;
  }

  async patchForumThread(id: string, dto: AdminPatchForumThreadDto) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id } });
    if (!thread) throw new NotFoundException();
    if (dto.categoryId) {
      const cat = await this.prisma.forumCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Категория не найдена');
    }
    if (dto.authorId) {
      const u = await this.prisma.user.findUnique({ where: { id: dto.authorId } });
      if (!u) throw new NotFoundException('Пользователь не найден');
    }
    return this.prisma.forumThread.update({
      where: { id },
      data: {
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        ...(dto.authorId ? { authorId: dto.authorId } : {}),
      },
      include: {
        category: true,
        author: { select: { id: true, email: true, profile: true } },
      },
    });
  }

  async deleteForumThread(id: string) {
    await this.prisma.forumThread.delete({ where: { id } });
    return { ok: true };
  }

  async patchForumPost(id: string, dto: AdminPatchForumPostDto) {
    const post = await this.prisma.forumPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    if (dto.authorId) {
      const u = await this.prisma.user.findUnique({ where: { id: dto.authorId } });
      if (!u) throw new NotFoundException('Пользователь не найден');
    }
    const updated = await this.prisma.forumPost.update({
      where: { id },
      data: {
        body: dto.body,
        ...(dto.authorId ? { authorId: dto.authorId } : {}),
      },
    });
    await this.prisma.forumThread.update({
      where: { id: post.threadId },
      data: { updatedAt: new Date() },
    });
    return updated;
  }

  async deleteForumPost(id: string) {
    const post = await this.prisma.forumPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException();
    const count = await this.prisma.forumPost.count({ where: { threadId: post.threadId } });
    if (count <= 1) {
      throw new BadRequestException('Нельзя удалить единственный пост в теме — удалите тему целиком.');
    }
    await this.prisma.forumPost.delete({ where: { id } });
    return { ok: true };
  }

  /** Иллюстрации на темах и строки /uploads/thread/… в телах постов — для раздела админки «Вложения». */
  async forumAttachmentsOverview() {
    const lineImageRx =
      /^\/uploads\/(?:thread\/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp|gif)|messages\/[0-9a-f-]{36}\.(?:jpe?g|png|webp|gif|pdf|txt|docx))$/i;

    const extractUrlsFromBody = (body: string): string[] => {
      const out = new Set<string>();
      for (const raw of (body ?? '').split('\n')) {
        const line = raw.trim();
        if (lineImageRx.test(line)) out.add(line);
      }
      return [...out];
    };

    const [threadsWithCover, recentPosts] = await Promise.all([
      this.prisma.forumThread.findMany({
        where: { NOT: { coverImageUrls: { equals: [] } } },
        orderBy: { updatedAt: 'desc' },
        take: 60,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          coverImageUrls: true,
        },
      }),
      this.prisma.forumPost.findMany({
        orderBy: { createdAt: 'desc' },
        take: 300,
        select: {
          id: true,
          body: true,
          createdAt: true,
          threadId: true,
          thread: { select: { title: true } },
        },
      }),
    ]);

    const postsWithAttachments = recentPosts
      .map((p) => {
        const urls = extractUrlsFromBody(p.body ?? '');
        return { post: p, urls };
      })
      .filter((x) => x.urls.length > 0)
      .slice(0, 80);

    return {
      threadCovers: threadsWithCover,
      postsWithAttachments,
    };
  }

  articleCategories() {
    return this.prisma.articleCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { articles: true } } },
    });
  }

  async createArticleCategory(dto: AdminCreateArticleCategoryDto) {
    const exists = await this.prisma.articleCategory.findUnique({ where: { slug: dto.slug } });
    if (exists) throw new ConflictException('slug уже занят');
    return this.prisma.articleCategory.create({ data: dto });
  }

  async patchArticleCategory(id: string, dto: AdminPatchArticleCategoryDto) {
    if (dto.slug) {
      const clash = await this.prisma.articleCategory.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (clash) throw new ConflictException('slug уже занят');
    }
    return this.prisma.articleCategory.update({ where: { id }, data: dto });
  }

  async deleteArticleCategory(id: string) {
    const n = await this.prisma.article.count({ where: { categoryId: id } });
    if (n > 0) {
      throw new BadRequestException(`В категории ${n} статей. Сначала удалите или перенесите их.`);
    }
    await this.prisma.articleCategory.delete({ where: { id } });
    return { ok: true };
  }

  async articlesList(q?: string, page = 1, pageSize = 20, moderation?: string) {
    const { skip, take, page: p, pageSize: ps } = this.paginate(page, pageSize);
    const where: Prisma.ArticleWhereInput = {};
    const m = (moderation ?? '').trim().toUpperCase();
    if (m && m !== 'ALL' && (Object.values(ArticleModerationStatus) as string[]).includes(m)) {
      where.moderationStatus = m as ArticleModerationStatus;
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
        take,
        include: {
          category: true,
          author: { select: { id: true, email: true, profile: true } },
        },
      }),
      this.prisma.article.count({ where }),
    ]);
    return { items, total, page: p, pageSize: ps };
  }

  async createArticle(dto: AdminCreateArticleDto) {
    const author = await this.prisma.user.findUnique({ where: { id: dto.authorId } });
    if (!author) throw new NotFoundException('Автор не найден');
    const cat = await this.prisma.articleCategory.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Категория не найдена');
    const attachmentUrls = sanitizeArticleSubmissionAttachmentUrls(dto.attachmentUrls ?? [], 15);
    const published = dto.published ?? true;
    const moderationStatus = dto.moderationStatus ?? ArticleModerationStatus.NONE;
    return this.prisma.article.create({
      data: {
        categoryId: dto.categoryId,
        title: dto.title,
        excerpt: dto.excerpt,
        body: dto.body,
        published,
        moderationStatus,
        attachmentUrls,
        authorId: dto.authorId,
      },
      include: { category: true, author: { select: { id: true, email: true } } },
    });
  }

  async patchArticle(id: string, dto: AdminPatchArticleDto) {
    const a = await this.prisma.article.findUnique({ where: { id } });
    if (!a) throw new NotFoundException();
    if (dto.authorId) {
      const u = await this.prisma.user.findUnique({ where: { id: dto.authorId } });
      if (!u) throw new NotFoundException('Пользователь не найден');
    }
    if (dto.categoryId) {
      const c = await this.prisma.articleCategory.findUnique({ where: { id: dto.categoryId } });
      if (!c) throw new NotFoundException('Категория не найдена');
    }
    let moderationStatus = dto.moderationStatus;
    if (dto.published === true && dto.moderationStatus === undefined) {
      if (
        a.moderationStatus === ArticleModerationStatus.PENDING ||
        a.moderationStatus === ArticleModerationStatus.REJECTED
      ) {
        moderationStatus = ArticleModerationStatus.APPROVED;
      }
    }
    const attachmentUrls =
      dto.attachmentUrls !== undefined
        ? sanitizeArticleSubmissionAttachmentUrls(dto.attachmentUrls, 15)
        : undefined;
    return this.prisma.article.update({
      where: { id },
      data: {
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.authorId ? { authorId: dto.authorId } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.excerpt !== undefined ? { excerpt: dto.excerpt } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
        ...(moderationStatus !== undefined ? { moderationStatus } : {}),
        ...(attachmentUrls !== undefined ? { attachmentUrls } : {}),
      },
      include: {
        category: true,
        author: { select: { id: true, email: true, profile: true } },
      },
    });
  }

  async deleteArticle(id: string) {
    await this.prisma.article.delete({ where: { id } });
    return { ok: true };
  }

  async listingsList(type?: ListingType, q?: string, page = 1, pageSize = 20) {
    const { skip, take, page: p, pageSize: ps } = this.paginate(page, pageSize);
    const where: Prisma.ListingWhereInput = {};
    if (type) where.type = type;
    if (q && q.trim().length >= 2) {
      const needle = q.trim();
      where.OR = [
        { title: { contains: needle, mode: 'insensitive' } },
        { description: { contains: needle, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          author: { select: { id: true, email: true, profile: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items, total, page: p, pageSize: ps };
  }

  async patchListing(id: string, dto: AdminPatchListingDto) {
    const l = await this.prisma.listing.findUnique({ where: { id } });
    if (!l) throw new NotFoundException();
    if (dto.authorId) {
      const u = await this.prisma.user.findUnique({ where: { id: dto.authorId } });
      if (!u) throw new NotFoundException('Пользователь не найден');
    }
    return this.prisma.listing.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.region !== undefined ? { region: dto.region } : {}),
        ...(dto.authorId ? { authorId: dto.authorId } : {}),
      },
      include: {
        author: { select: { id: true, email: true, profile: true } },
        messages: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async deleteListing(id: string) {
    await this.prisma.listing.delete({ where: { id } });
    return { ok: true };
  }

  async deleteListingMessage(listingId: string, messageId: string) {
    const m = await this.prisma.listingMessage.findFirst({
      where: { id: messageId, listingId },
    });
    if (!m) throw new NotFoundException();
    await this.prisma.listingMessage.delete({ where: { id: messageId } });
    return { ok: true };
  }

  reportsList() {
    return this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        reporter: { select: { id: true, email: true } },
        reportedUser: { select: { id: true, email: true, profile: { select: { displayName: true } } } },
        thread: { include: { category: true } },
        post: { include: { thread: true } },
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

  async patchReport(id: string, dto: AdminPatchReportDto, moderatorId: string) {
    const status = dto.status.trim();
    const r = await this.prisma.report.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();

    // Базовый сценарий: только смена статуса без санкций.
    if (status !== 'ACTION_TAKEN') {
      return this.prisma.report.update({ where: { id }, data: { status } });
    }

    if (!dto.sanction) {
      throw new BadRequestException('Для статуса ACTION_TAKEN укажите sanction (WARN | TEMP_SUSPEND | LIFETIME_BAN).');
    }

    const targetUserId = await this.moderation.resolveModerationTargetUserId(id);
    if (!targetUserId) {
      throw new BadRequestException('Не удалось определить пользователя для санкции по этой жалобе.');
    }

    await this.moderation.applySanctionFromReport({
      reportId: id,
      moderatorId,
      targetUserId,
      sanction: dto.sanction,
      reasonPublic: dto.sanctionReasonPublic,
      temporaryHours: dto.temporaryHours,
    });

    return this.prisma.report.update({ where: { id }, data: { status } });
  }

  sosList(page = 1, pageSize = 50) {
    const { skip, take, page: p, pageSize: ps } = this.paginate(page, pageSize);
    return this.prisma.sosRequest
      .findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          author: { select: { id: true, email: true, profile: { include: { country: true } } } },
        },
      })
      .then((items) =>
        this.prisma.sosRequest.count().then((total) => ({ items, total, page: p, pageSize: ps })),
      );
  }

  async patchSos(id: string, status: SosStatus) {
    const sos = await this.prisma.sosRequest.findUnique({ where: { id } });
    if (!sos) throw new NotFoundException();
    return this.prisma.sosRequest.update({ where: { id }, data: { status } });
  }

  countries() {
    return this.prisma.country.findMany({
      orderBy: { nameRu: 'asc' },
      include: { _count: { select: { profiles: true } } },
    });
  }

  async createCountry(dto: AdminCreateCountryDto) {
    const exists = await this.prisma.country.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException('Код страны уже есть');
    return this.prisma.country.create({ data: dto });
  }

  async patchCountry(id: string, dto: AdminPatchCountryDto) {
    if (dto.code) {
      const clash = await this.prisma.country.findFirst({
        where: { code: dto.code, NOT: { id } },
      });
      if (clash) throw new ConflictException('Код страны уже занят');
    }
    return this.prisma.country.update({ where: { id }, data: dto });
  }

  async deleteCountry(id: string) {
    const n = await this.prisma.profile.count({ where: { countryId: id } });
    if (n > 0) {
      throw new BadRequestException(`Страна используется в ${n} профилях.`);
    }
    await this.prisma.country.delete({ where: { id } });
    return { ok: true };
  }

  jobTitles() {
    return this.prisma.jobTitle.findMany({
      orderBy: { nameRu: 'asc' },
      include: { _count: { select: { profiles: true } } },
    });
  }

  async createJobTitle(dto: AdminCreateJobTitleDto) {
    return this.prisma.jobTitle.create({ data: dto });
  }

  async patchJobTitle(id: string, dto: AdminPatchJobTitleDto) {
    return this.prisma.jobTitle.update({ where: { id }, data: dto });
  }

  async deleteJobTitle(id: string) {
    const n = await this.prisma.profile.count({ where: { jobTitleId: id } });
    if (n > 0) {
      throw new BadRequestException(`Должность используется в ${n} профилях.`);
    }
    await this.prisma.jobTitle.delete({ where: { id } });
    return { ok: true };
  }

  pushTokens(page = 1, pageSize = 50) {
    const { skip, take, page: p, pageSize: ps } = this.paginate(page, pageSize);
    return this.prisma.pushToken
      .findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { user: { select: { id: true, email: true } } },
      })
      .then((items) =>
        this.prisma.pushToken.count().then((total) => ({ items, total, page: p, pageSize: ps })),
      );
  }

  async deletePushToken(id: string) {
    await this.prisma.pushToken.delete({ where: { id } });
    return { ok: true };
  }

  async adjustVetcoin(dto: AdminVetcoinAdjustDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return this.vetcoin.applyDelta(user.id, dto.delta, dto.reason.trim());
  }

  /**
   * Установка абсолютного баланса VetCoin пользователю. Требуется пароль действующего администратора.
   */
  async setUserVetcoinBalance(
    targetUserId: string,
    dto: AdminSetUserVetcoinDto,
    actor: AuthUser,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const actorUser = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { passwordHash: true, email: true },
    });
    if (!actorUser?.passwordHash) throw new UnauthorizedException();
    const passwordOk = await bcrypt.compare(dto.adminPassword, actorUser.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Неверный пароль администратора');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, vetCoinBalance: true },
    });
    if (!target) throw new NotFoundException();

    const newB = dto.vetCoinBalance;
    if (!Number.isInteger(newB) || newB < 0) {
      throw new BadRequestException('Баланс должен быть целым неотрицательным числом');
    }

    const delta = newB - target.vetCoinBalance;
    const reasonTail = (dto.reason?.trim() || 'ручная установка баланса').slice(0, 400);
    const reason = `ADMIN_SET_BALANCE ${actor.email} → ${target.email}: ${reasonTail}`;

    const res = await this.vetcoin.applyDelta(targetUserId, delta, reason);

    await this.audit.log({
      action: 'admin.user.vetcoin_set',
      actorUserId: actor.id,
      actorEmail: actor.email,
      details: {
        targetUserId,
        targetEmail: target.email,
        previousBalance: target.vetCoinBalance,
        newBalance: res.balance,
      },
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });

    return { balance: res.balance, previousBalance: target.vetCoinBalance };
  }
}
