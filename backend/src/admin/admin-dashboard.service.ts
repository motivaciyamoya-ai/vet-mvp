import { Injectable, NotFoundException } from '@nestjs/common';
import { ListingType, SosStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Считаем ряды по UTC-дате создания без сырого SQL (совместимость, меньше сюрпризов с драйвером/PG).
   */
  private utcDayBuckets(rows: readonly { createdAt: Date }[]): { date: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const k = r.createdAt.toISOString().slice(0, 10);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  /**
   * Если миграция с iconEmoji ещё не наката — не валим весь /analytics.
   */
  private async forumCategoriesForBreakdown(catIds: string[]) {
    if (catIds.length === 0) return [];

    try {
      return await this.prisma.forumCategory.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true, slug: true, iconEmoji: true },
      });
    } catch {
      const rows = await this.prisma.forumCategory.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true, slug: true },
      });
      return rows.map((r) => ({ ...r, iconEmoji: '💬' }));
    }
  }

  async analytics() {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 14);
    since.setUTCHours(0, 0, 0, 0);

    let pushTokens = 0;
    try {
      pushTokens = await this.prisma.pushToken.count();
    } catch {
      pushTokens = 0;
    }

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
      usersByRole,
      listingsByType,
      sosByStatus,
      forumThreadsByCategory,
      userCreationsSince,
      threadCreationsSince,
      postCreationsSince,
      articleCreationsSince,
      recentUsers,
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
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.listing.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.sosRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.forumThread.groupBy({ by: ['categoryId'], _count: { _all: true } }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.forumThread.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.forumPost.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.article.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, email: true, role: true, createdAt: true },
      }),
    ]);

    const dailyUsers = this.utcDayBuckets(userCreationsSince);
    const dailyThreads = this.utcDayBuckets(threadCreationsSince);
    const dailyPosts = this.utcDayBuckets(postCreationsSince);
    const dailyArticles = this.utcDayBuckets(articleCreationsSince);

    const catIds = forumThreadsByCategory.map((x) => x.categoryId).filter(Boolean);
    const cats = await this.forumCategoriesForBreakdown(catIds);
    const catMap = new Map<string, (typeof cats)[number]>(
      cats.map((c) => [c.id, c] as [string, (typeof cats)[number]]),
    );

    const forumCategoryBreakdown = forumThreadsByCategory.map((row) => ({
      categoryId: row.categoryId,
      count: row._count._all,
      category: catMap.get(row.categoryId) ?? null,
    }));

    return {
      summary: {
        users,
        forumCategories,
        forumThreads,
        forumPosts,
        articles,
        listings,
        reports,
        sosOpen,
        sosTotal,
        pushTokens,
      },
      usersByRole: usersByRole.map((r) => ({
        role: r.role as UserRole,
        count: r._count._all,
      })),
      listingsByType: listingsByType.map((r) => ({
        type: r.type as ListingType,
        count: r._count._all,
      })),
      sosByStatus: sosByStatus.map((r) => ({
        status: r.status as SosStatus,
        count: r._count._all,
      })),
      forumCategoryBreakdown,
      series: {
        users: dailyUsers,
        threads: dailyThreads,
        posts: dailyPosts,
        articles: dailyArticles,
      },
      recentUsers,
    };
  }

  siteSettings() {
    return this.prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async putSiteSetting(key: string, value: string) {
    return this.prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  async deleteSiteSetting(key: string) {
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    if (!row) throw new NotFoundException();
    await this.prisma.siteSetting.delete({ where: { key } });
    return { ok: true };
  }
}
