import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdateThreadOpeningDto } from './dto/update-thread-opening.dto';
import { UpdateForumPostDto } from './dto/update-forum-post.dto';
import { VetcoinService } from '../vetcoin/vetcoin.service';
import { ModerationService } from '../moderation/moderation.service';
import { SecurityPoliciesService } from '../security/security-policies.service';
import {
  sanitizeForumAttachmentUrlList,
  isThreadImageAttachmentLine,
  isMessageAttachmentLine,
} from '../uploads/message-attachments.policy';
import { UploadsConfigService } from '../uploads/uploads-config.service';

/** Маркер в тегах: `URGENCY:medium|high|critical` — с сервера снимается стоимость горячей темы. */
function parseHotUrgency(tags: string): {
  urgency: 'medium' | 'high' | 'critical' | null;
  rest: string;
} {
  const t = (tags || '').trim();
  const m = /\bURGENCY:\s*(medium|high|critical)\b/i.exec(t);
  if (!m) return { urgency: null, rest: t };
  const urgency = m[1].toLowerCase() as 'medium' | 'high' | 'critical';
  const rest = t.replace(/\bURGENCY:\s*(medium|high|critical)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  return { urgency, rest };
}

function finalizeHotTags(rest: string, urgency: 'medium' | 'high' | 'critical'): string {
  const base = rest.replace(/\s+/g, ' ').trim();
  const tail = ['горяч', 'HOT', `URGENCY:${urgency}`].join(' ');
  return base ? `${base} ${tail}` : tail;
}

/** Совпадает с эвристикой клиента (`forumTags.ts`). */
function tagsLookHotServer(tags: string): boolean {
  const t = tags || '';
  if (/\bURGENCY:\s*(medium|high|critical)\b/i.test(t)) return true;
  return /\b(горяч|hot|срочн|sos)\b/i.test(t.toLowerCase());
}

const HOT_TOPIC_NOTIFICATION_PICK = 'HOT_TOPIC_PICK_SOLUTION';
const HOT_TOPIC_NOTIFICATION_SOLVER = 'HOT_TOPIC_SOLUTION_CREDIT';
const FORUM_THREAD_REPLY = 'FORUM_THREAD_REPLY';

/** Краткий текст для лент без переносов — защита от слишком длинных тел в JSON. */
function excerptForumBodyForFeed(raw: string, max = 280): string {
  const t = (raw || '').replace(/\s+/g, ' ').trim();
  if (!t.length) return '';
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const UUID_V4_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Только обложки темы — пути `/uploads/thread/…`. */
function sanitizeThreadCoverImageUrls(raw?: string[]): string[] {
  return sanitizeForumAttachmentUrlList(raw, 8).filter(isThreadImageAttachmentLine);
}

/** Поля связанного сообщения-победителя для лент (имя и аватар автора решения). */
const acceptedAuthorSelect = {
  author: {
    select: {
      email: true,
      profile: { select: { displayName: true, avatarUrl: true } },
    },
  },
} as const;

@Injectable()
export class ForumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vetcoin: VetcoinService,
    private readonly moderation: ModerationService,
    private readonly securityPolicies: SecurityPoliciesService,
    private readonly uploadsConfig: UploadsConfigService,
  ) {}

  categories() {
    return this.prisma.forumCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { threads: true } } },
    });
  }

  /** Базовая цена горячей темы из `SiteSetting` `vetcoin.hot_topic_cost` — та же, что списание в `createThread`. */
  async hotTopicPricing(): Promise<{ hotTopicBaseCost: number }> {
    const hotTopicBaseCost = await this.vetcoin.settingInt('vetcoin.hot_topic_cost', 50);
    return { hotTopicBaseCost };
  }

  /** Последний пост в теме как «комментарий» — только если уже есть ответы (≥2 постов). */
  private latestPostInclude(): Prisma.ForumThreadInclude {
    return {
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              profile: { select: { displayName: true } },
            },
          },
        },
      },
    };
  }

  private mapThreadWithLatestComment<
    T extends {
      _count: { posts: number };
      posts: Array<{
        body: string;
        createdAt: Date;
        author?: {
          id: string;
          email: string;
          profile: { displayName: string | null } | null;
        } | null;
      }>;
    },
  >(row: T): Omit<T, 'posts'> & {
    latestComment: null | {
      body: string;
      createdAt: string;
      author: { id: string; email: string; profile: { displayName: string | null } | null };
    };
  } {
    const n = row._count.posts;
    const last = row.posts[0];
    const { posts, ...rest } = row;
    if (n < 2 || !last || !last.author) {
      return { ...rest, latestComment: null };
    }
    return {
      ...rest,
      latestComment: {
        body: excerptForumBodyForFeed(last.body),
        createdAt: last.createdAt.toISOString(),
        author: last.author,
      },
    };
  }

  async threadsFeed(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const take = Math.min(pageSize, 50);
    const [rawItems, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              profile: { include: { country: true, jobTitle: true } },
            },
          },
          category: true,
          acceptedPost: { select: acceptedAuthorSelect },
          _count: { select: { posts: true } },
          ...this.latestPostInclude(),
        },
      }),
      this.prisma.forumThread.count(),
    ]);
    const items = rawItems.map((row) => this.mapThreadWithLatestComment(row));
    return { items, total, page, pageSize: take };
  }

  async threadsByCategorySlug(slug: string, page = 1, pageSize = 20) {
    const cat = await this.prisma.forumCategory.findUnique({ where: { slug } });
    if (!cat) throw new NotFoundException('Категория не найдена');
    const skip = (page - 1) * pageSize;
    const [rawItems, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        where: { categoryId: cat.id },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          author: {
            select: {
              id: true,
              email: true,
              profile: { include: { country: true, jobTitle: true } },
            },
          },
          category: true,
          acceptedPost: { select: acceptedAuthorSelect },
          _count: { select: { posts: true } },
          ...this.latestPostInclude(),
        },
      }),
      this.prisma.forumThread.count({ where: { categoryId: cat.id } }),
    ]);
    const items = rawItems.map((row) => this.mapThreadWithLatestComment(row));
    return { items, total, page, pageSize };
  }

  /**
   * Засчитывает один уникальный просмотр на пару тема×посетитель.
   * Авторизованный: viewerKey = `u:{userId}`; гость: `a:{anonVisitorId}` (UUID v4 в localStorage).
   */
  async registerUniqueView(
    threadId: string,
    opts: { userId: string | null; anonVisitorId?: string | null },
  ): Promise<{ uniqueViewCount: number; counted: boolean }> {
    const exists = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true, uniqueViewCount: true },
    });
    if (!exists) throw new NotFoundException();

    let viewerKey: string;
    const uid = opts.userId?.trim();
    if (uid) {
      viewerKey = `u:${uid}`;
    } else {
      const aid = opts.anonVisitorId?.trim();
      if (!aid) {
        throw new BadRequestException('Для гостей укажите anonVisitorId (UUID v4).');
      }
      viewerKey = `a:${aid.toLowerCase()}`;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.forumThreadViewer.create({
          data: { threadId, viewerKey },
        });
        await tx.forumThread.update({
          where: { id: threadId },
          data: { uniqueViewCount: { increment: 1 } },
        });
      });
      const row = await this.prisma.forumThread.findUnique({
        where: { id: threadId },
        select: { uniqueViewCount: true },
      });
      return { uniqueViewCount: row!.uniqueViewCount, counted: true };
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const row = await this.prisma.forumThread.findUnique({
          where: { id: threadId },
          select: { uniqueViewCount: true },
        });
        return { uniqueViewCount: row!.uniqueViewCount, counted: false };
      }
      throw e;
    }
  }

  /** Для GET темы — без ошибок при кривом query. */
  private buildLikerKeyForRead(opts: {
    viewerUserId: string | null;
    anonVisitorId?: string | null;
  }): string | null {
    const uid = opts.viewerUserId?.trim();
    if (uid) return `u:${uid}`;
    const aid = opts.anonVisitorId?.trim();
    if (aid && UUID_V4_RX.test(aid)) return `a:${aid.toLowerCase()}`;
    return null;
  }

  private resolveLikerKeyWritable(opts: {
    userId: string | null;
    anonVisitorId?: string | null;
  }): string {
    const uid = opts.userId?.trim();
    if (uid) return `u:${uid}`;
    const aid = opts.anonVisitorId?.trim();
    if (aid && UUID_V4_RX.test(aid)) return `a:${aid.toLowerCase()}`;
    throw new BadRequestException('Для лайка войдите в аккаунт или укажите anonVisitorId (UUID v4).');
  }

  async threadById(
    id: string,
    viewer?: { viewerUserId: string | null; anonVisitorId?: string | null },
  ) {
    const thread = await this.prisma.forumThread.findUnique({
      where: { id },
      include: {
        category: true,
        author: {
          select: {
            id: true,
            email: true,
            profile: { include: { country: true, jobTitle: true } },
          },
        },
        posts: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                email: true,
                profile: { include: { country: true, jobTitle: true } },
              },
            },
          },
        },
      },
    });
    if (!thread) throw new NotFoundException();

    const authorIds = Array.from(
      new Set<string>([thread.author.id, ...thread.posts.map((p) => p.author.id)]),
    );
    const modMap = await this.moderation.publicSummaryForUsers(authorIds);

    let likedByMe = false;
    if (viewer) {
      const likerKey = this.buildLikerKeyForRead({
        viewerUserId: viewer.viewerUserId ?? null,
        anonVisitorId: viewer.anonVisitorId ?? null,
      });
      if (likerKey) {
        const hit = await this.prisma.forumThreadLike.findUnique({
          where: { threadId_likerKey: { threadId: id, likerKey } },
        });
        likedByMe = !!hit;
      }
    }
    return {
      ...thread,
      likedByMe,
      authorModeration: modMap.get(thread.author.id),
      posts: thread.posts.map((p) => ({
        ...p,
        authorModeration: modMap.get(p.author.id),
      })),
    };
  }

  /** Добавить или убрать лайк темы одним ключом посетителя. */
  async toggleThreadLike(
    threadId: string,
    opts: { userId: string | null; anonVisitorId?: string | null },
  ): Promise<{ likeCount: number; liked: boolean }> {
    const exists = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException();
    const likerKey = this.resolveLikerKeyWritable(opts);

    const liked = await this.prisma.$transaction(async (tx) => {
      const row = await tx.forumThreadLike.findUnique({
        where: { threadId_likerKey: { threadId, likerKey } },
      });
      if (row) {
        await tx.forumThreadLike.delete({
          where: { threadId_likerKey: { threadId, likerKey } },
        });
        await tx.forumThread.updateMany({
          where: { id: threadId, likeCount: { gt: 0 } },
          data: { likeCount: { decrement: 1 } },
        });
        return false;
      }
      await tx.forumThreadLike.create({ data: { threadId, likerKey } });
      await tx.forumThread.update({
        where: { id: threadId },
        data: { likeCount: { increment: 1 } },
      });
      return true;
    });

    const row = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      select: { likeCount: true },
    });
    return { likeCount: row!.likeCount, liked };
  }

  private assertForumThreadOpen(thread: { solvedAt: Date | null }): void {
    if (thread.solvedAt) {
      throw new ForbiddenException(
        'Тема закрыта: новые ответы и правки сообщений недоступны.',
      );
    }
  }

  async createThread(userId: string, dto: CreateThreadDto) {
    const cat = await this.prisma.forumCategory.findUnique({ where: { id: dto.categoryId } });
    if (!cat) throw new NotFoundException('Категория не найдена');
    await this.moderation.maybeClearExpiredSanctions(userId);
    await this.securityPolicies.assertUserVerifiedForContent(userId);

    const rawTags = dto.tags ?? '';
    const { urgency, rest } = parseHotUrgency(rawTags);
    const tagsToStore = urgency ? finalizeHotTags(rest, urgency) : rest.trim();
    const coverImageUrls = sanitizeThreadCoverImageUrls(dto.coverImageUrls ?? []);

    const thread = await this.prisma.$transaction(async (tx) => {
      if (urgency) {
        const base = await this.vetcoin.settingInt('vetcoin.hot_topic_cost', 50);
        const mult = urgency === 'medium' ? 1 : urgency === 'high' ? 2 : 3;
        const fee = base * mult;
        if (fee > 0) {
          const modRow = await tx.user.findUnique({
            where: { id: userId },
            select: { moderationStatus: true, moderationUntil: true, role: true },
          });
          if (modRow) {
            this.moderation.assertCanSpendVetcoin(modRow.role, modRow);
          }

          await this.vetcoin.applyDeltaInTransaction(
            tx,
            userId,
            -fee,
            `Горячая тема (${urgency}): ${dto.title}`,
          );
        }
      }
      const created = await tx.forumThread.create({
        data: {
          categoryId: dto.categoryId,
          authorId: userId,
          title: dto.title,
          tags: tagsToStore,
          posts: { create: { authorId: userId, body: dto.body } },
        },
      });
      if (coverImageUrls.length > 0) {
        const elements = coverImageUrls.map((url) => Prisma.sql`${url}`);
        await tx.$executeRaw`
          UPDATE "ForumThread"
          SET "coverImageUrls" = ARRAY[${Prisma.join(elements)}]::text[]
          WHERE "id" = ${created.id}
        `;
      }
      return created;
    });

    try {
      const bonus = await this.vetcoin.settingInt('vetcoin.forum_new_thread_bonus', 25);
      if (bonus > 0) {
        await this.vetcoin.applyDelta(userId, bonus, 'Новая тема на форуме');
      }
    } catch {
      /* не блокируем создание темы при ошибках учёта */
    }

    return this.threadById(thread.id);
  }

  async addPost(threadId: string, userId: string, dto: CreatePostDto) {
    const thread = await this.prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) throw new NotFoundException();
    this.assertForumThreadOpen(thread);
    await this.securityPolicies.assertUserVerifiedForContent(userId);
    const maxLines = await this.uploadsConfig.forumMaxAttachmentLines();
    const filesEnabled = await this.uploadsConfig.messageAttachmentsEnabled();
    const rawUrls = filesEnabled
      ? (dto.attachmentUrls ?? [])
      : (dto.attachmentUrls ?? []).filter((u) => typeof u === 'string' && !isMessageAttachmentLine(u));
    const urls = sanitizeForumAttachmentUrlList(rawUrls, maxLines);
    const text = (dto.body ?? '').trim();
    if (!text && urls.length === 0) {
      throw new BadRequestException('Введите текст ответа или прикрепите файл');
    }
    const body =
      urls.length === 0 ? text : text ? `${text}\n\n${urls.join('\n')}` : urls.join('\n');
    if (body.length > 20000) {
      throw new BadRequestException('Сообщение с прикреплёнными файлами превышает лимит 20000 символов');
    }
    await this.prisma.forumPost.create({
      data: { threadId, authorId: userId, body },
    });
    await this.prisma.forumThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Уведомления: всем участникам темы (автор + все, кто писал), кроме автора текущего ответа.
    try {
      const replier = await this.prisma.profile.findUnique({
        where: { userId },
        select: { displayName: true },
      });
      const who = replier?.displayName?.trim() || 'Участник';
      const excerpt = excerptForumBodyForFeed(dto.body, 220);

      const authors = await this.prisma.forumPost.findMany({
        where: { threadId },
        select: { authorId: true },
        distinct: ['authorId'],
      });
      const targets = new Set<string>([thread.authorId, ...authors.map((a) => a.authorId)]);
      targets.delete(userId);

      const data = [...targets].map((uid) => ({
        userId: uid,
        type: FORUM_THREAD_REPLY,
        threadId,
        actorUserId: userId,
        title: 'Новый ответ в теме, где вы участвовали',
        body: `${who}: ${excerpt}`,
      }));
      if (data.length > 0) {
        await this.prisma.userNotification.createMany({ data });
      }
    } catch {
      /* уведомления не критичны */
    }

    try {
      const bonus = await this.vetcoin.settingInt('vetcoin.forum_reply_bonus', 10);
      if (bonus > 0 && userId !== thread.authorId) {
        await this.vetcoin.applyDelta(userId, bonus, 'Ответ в теме форума');
      }
    } catch {
      /* не блокируем пост */
    }

    try {
      await this.maybeNotifyAuthorToPickSolution(thread, userId);
    } catch {
      /* напоминание не критично */
    }

    return this.threadById(threadId);
  }

  /** Автор темы: заголовок и/или текст первого сообщения, только пока тема открыта. */
  async updateThreadOpening(threadId: string, editorId: string, dto: UpdateThreadOpeningDto) {
    if (dto.title === undefined && dto.body === undefined) {
      throw new BadRequestException('Укажите заголовок и/или текст темы.');
    }

    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      include: {
        posts: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!thread) throw new NotFoundException();
    if (thread.authorId !== editorId) {
      throw new ForbiddenException('Изменять тему может только её автор.');
    }
    this.assertForumThreadOpen(thread);

    const opener = thread.posts[0];
    if (!opener) throw new NotFoundException();

    await this.prisma.$transaction(async (tx) => {
      if (dto.title !== undefined) {
        await tx.forumThread.update({
          where: { id: threadId },
          data: { title: dto.title.trim() },
        });
      }
      if (dto.body !== undefined) {
        await tx.forumPost.update({
          where: { id: opener.id },
          data: { body: dto.body.trim() },
        });
      }
    });

    return this.threadById(threadId);
  }

  /** Автор сообщения может править текст, пока тема открыта. */
  async updateForumPost(editorId: string, postId: string, dto: UpdateForumPostDto) {
    const post = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        thread: true,
      },
    });
    if (!post) throw new NotFoundException();
    if (post.authorId !== editorId) {
      throw new ForbiddenException('Изменять можно только своё сообщение.');
    }
    this.assertForumThreadOpen(post.thread);

    await this.prisma.forumPost.update({
      where: { id: postId },
      data: { body: dto.body.trim() },
    });
    await this.prisma.forumThread.update({
      where: { id: post.threadId },
      data: { updatedAt: new Date() },
    });

    return this.threadById(post.threadId);
  }

  /** Одно напоминание автору темы после появления ответа от коллеги (горячие темы, пока не решено). */
  private async maybeNotifyAuthorToPickSolution(
    thread: { id: string; authorId: string; tags: string; title: string; solvedAt: Date | null; solutionPickNotifiedAt: Date | null },
    replierId: string,
  ) {
    if (thread.solvedAt || !tagsLookHotServer(thread.tags)) return;
    if (replierId === thread.authorId) return;

    const postCount = await this.prisma.forumPost.count({ where: { threadId: thread.id } });
    if (postCount < 2) return;

    const fresh = await this.prisma.forumThread.findUnique({
      where: { id: thread.id },
      select: { solvedAt: true, solutionPickNotifiedAt: true },
    });
    if (!fresh?.solvedAt && !fresh?.solutionPickNotifiedAt) {
      await this.prisma.$transaction([
        this.prisma.userNotification.create({
          data: {
            userId: thread.authorId,
            type: HOT_TOPIC_NOTIFICATION_PICK,
            threadId: thread.id,
            title: 'Выберите ответ, который решил проблему',
            body: `В вашей горячей теме «${thread.title}» появился ответ. Укажите лучший — автор получит VetCoin.`,
          },
        }),
        this.prisma.forumThread.update({
          where: { id: thread.id },
          data: { solutionPickNotifiedAt: new Date() },
        }),
      ]);
    }
  }

  /**
   * Только автор темы. Отмечает ответ решением, начисляет бонус автору ответа, снимает «мигание» с горячих списков (solved).
   */
  async acceptSolution(threadId: string, authorUserId: string, postId: string) {
    const post = await this.prisma.forumPost.findFirst({
      where: { id: postId, threadId },
      select: {
        id: true,
        authorId: true,
        threadId: true,
      },
    });
    if (!post) throw new NotFoundException('Сообщение не найдено');

    const thread = await this.prisma.forumThread.findUnique({
      where: { id: threadId },
      select: {
        authorId: true,
        title: true,
        solvedAt: true,
        acceptedPostId: true,
      },
    });
    if (!thread) throw new NotFoundException();

    if (thread.authorId !== authorUserId) {
      throw new ForbiddenException('Только автор темы может выбрать решение');
    }

    if (thread.solvedAt && thread.acceptedPostId === postId) {
      return this.threadById(threadId);
    }
    if (thread.solvedAt && thread.acceptedPostId !== postId) {
      throw new BadRequestException('Тема уже помечена как решённая');
    }

    const opener = await this.prisma.forumPost.findFirst({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (opener?.id === postId) {
      throw new BadRequestException('Нельзя отметить первое сообщение темы как решение');
    }

    if (post.authorId === thread.authorId) {
      throw new BadRequestException(
        'Нельзя выбрать своё сообщение решением. Отметьте ответ другого пользователя.',
      );
    }

    const bonus = await this.vetcoin.settingInt('vetcoin.hot_topic_solution_bonus', 75);

    await this.prisma.$transaction(async (tx) => {
      await tx.forumThread.update({
        where: { id: threadId },
        data: { acceptedPostId: postId, solvedAt: new Date() },
      });

      await tx.userNotification.updateMany({
        where: {
          userId: thread.authorId,
          threadId,
          type: HOT_TOPIC_NOTIFICATION_PICK,
          read: false,
        },
        data: { read: true },
      });

      if (bonus > 0) {
        await this.vetcoin.applyDeltaInTransaction(
          tx,
          post.authorId,
          bonus,
          `Лучший ответ в горячей теме: «${thread.title}»`,
        );
      }

      await tx.userNotification.create({
        data: {
          userId: post.authorId,
          type: HOT_TOPIC_NOTIFICATION_SOLVER,
          threadId,
          title: 'Ваш ответ отмечен как решение',
          body:
            bonus > 0
              ? `Вы получили ${bonus} VetCoin за решение темы «${thread.title}».`
              : `Автор отметил ваш ответ в теме «${thread.title}» как решение.`,
        },
      });
    });

    return this.threadById(threadId);
  }

  async search(q: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    if (!q || q.trim().length < 2) return { items: [], total: 0, page, pageSize };
    const needle = q.trim();
    const [items, total] = await Promise.all([
      this.prisma.forumThread.findMany({
        where: {
          OR: [
            { title: { contains: needle, mode: 'insensitive' } },
            { tags: { contains: needle, mode: 'insensitive' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          category: true,
          acceptedPost: { select: acceptedAuthorSelect },
          author: {
            select: {
              id: true,
              profile: { include: { country: true } },
            },
          },
        },
      }),
      this.prisma.forumThread.count({
        where: {
          OR: [
            { title: { contains: needle, mode: 'insensitive' } },
            { tags: { contains: needle, mode: 'insensitive' } },
          ],
        },
      }),
    ]);
    return { items, total, page, pageSize };
  }

  /** Карточка «героя» для главной: последний принятый автором ответ. */
  async latestSolutionHeroSpotlight() {
    const row = await this.prisma.forumThread.findFirst({
      where: { acceptedPostId: { not: null }, solvedAt: { not: null } },
      orderBy: { solvedAt: 'desc' },
      select: {
        id: true,
        title: true,
        solvedAt: true,
        category: {
          select: { id: true, name: true, slug: true, iconEmoji: true },
        },
        acceptedPost: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    displayName: true,
                    avatarUrl: true,
                    city: true,
                    jobTitle: { select: { nameRu: true } },
                    country: { select: { nameRu: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!row?.acceptedPost || !row.solvedAt) return null;

    const ap = row.acceptedPost;
    const profile = ap.author.profile;
    const displayName = profile?.displayName?.trim() || ap.author.email;

    return {
      threadId: row.id,
      threadTitle: row.title,
      solvedAt: row.solvedAt.toISOString(),
      category: row.category,
      answerExcerpt: excerptForumBodyForFeed(ap.body, 320),
      helper: {
        id: ap.author.id,
        displayName,
        avatarUrl: profile?.avatarUrl ?? null,
        city: profile?.city ?? null,
        jobTitleRu: profile?.jobTitle?.nameRu ?? null,
        countryRu: profile?.country?.nameRu ?? null,
      },
    };
  }

  /** Сводка по разделам: сколько тем с выбранным решением и сколько разных авторов решений. */
  async heroesStatsByCategory() {
    const categories = await this.prisma.forumCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, iconEmoji: true },
    });

    const solutions = await this.prisma.forumPost.findMany({
      where: { acceptedAsSolutionIn: { isNot: null } },
      select: {
        authorId: true,
        acceptedAsSolutionIn: { select: { id: true, categoryId: true } },
      },
    });

    type Bucket = { threadIds: Set<string>; helpers: Set<string> };
    const map = new Map<string, Bucket>();
    for (const c of categories) {
      map.set(c.id, { threadIds: new Set(), helpers: new Set() });
    }
    for (const p of solutions) {
      const thr = p.acceptedAsSolutionIn;
      if (!thr) continue;
      const bucket = map.get(thr.categoryId);
      if (!bucket) continue;
      bucket.threadIds.add(thr.id);
      bucket.helpers.add(p.authorId);
    }

    const allHelpers = new Set(solutions.map((s) => s.authorId));

    return {
      categories: categories.map((c) => {
        const bucket = map.get(c.id)!;
        return {
          ...c,
          solvedTopicsCount: bucket.threadIds.size,
          uniqueHelpersCount: bucket.helpers.size,
        };
      }),
      totals: {
        solvedTopicsTotal: solutions.length,
        uniqueHelpersTotal: allHelpers.size,
      },
    };
  }
}
