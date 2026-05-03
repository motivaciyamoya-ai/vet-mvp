import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SpecialistsListQueryDto } from './dto/specialists-query.dto';

@Injectable()
export class ReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /** SPECLIST / MODERATOR для публичной статистики (без ADMIN). */
  private async publicSpecialistUserIds(): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { role: { not: UserRole.ADMIN } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  countries() {
    return this.prisma.country.findMany({ orderBy: { nameRu: 'asc' } });
  }

  jobTitles() {
    return this.prisma.jobTitle.findMany({ orderBy: { nameRu: 'asc' } });
  }

  /** Сводные цифры для главной: без выдуманных консультаций — только то, что есть в БД. */
  async specialistsOverview() {
    const userIds = await this.publicSpecialistUserIds();
    if (userIds.length === 0) {
      const threads = await this.prisma.forumThread.count().catch(() => 0);
      return {
        specialists: 0,
        countries: 0,
        cities: 0,
        forumTopics: threads,
      };
    }

    const profileWhere: Prisma.ProfileWhereInput = { userId: { in: userIds } };

    const [specialistProfiles, threads] = await Promise.all([
      this.prisma.profile.count({ where: profileWhere }),
      this.prisma.forumThread.count().catch(() => 0),
    ]);

    const countryRows = await this.prisma.profile.groupBy({
      by: ['countryId'],
      where: profileWhere,
      _count: { _all: true },
    });
    const countriesWithSpecialists = countryRows.length;

    const profiles = await this.prisma.profile.findMany({
      where: profileWhere,
      select: { city: true },
    });
    const citySet = new Set<string>();
    for (const p of profiles) {
      const c = (p.city ?? '').trim().toLowerCase();
      if (c.length > 0) citySet.add(c);
    }
    const distinctCitiesCount = citySet.size;

    return {
      specialists: specialistProfiles,
      countries: countriesWithSpecialists,
      cities: distinctCitiesCount,
      forumTopics: threads,
    };
  }

  /** Специалистов по стране (данные профилей при регистрации). */
  async specialistsByCountry() {
    const userIds = await this.publicSpecialistUserIds();
    if (userIds.length === 0) {
      return { totalSpecialists: 0, items: [] };
    }

    const profileWhere = { userId: { in: userIds } } as const;

    const grouped = await this.prisma.profile.groupBy({
      by: ['countryId'],
      where: profileWhere,
      _count: { _all: true },
    });

    if (grouped.length === 0) {
      return { totalSpecialists: 0, items: [] };
    }

    const countryIds = [...new Set(grouped.map((g) => g.countryId))];
    const countries = await this.prisma.country.findMany({
      where: { id: { in: countryIds } },
      select: { id: true, code: true, nameRu: true },
    });
    const countryMap = new Map(countries.map((c) => [c.id, c]));

    const profiles = await this.prisma.profile.findMany({
      where: profileWhere,
      select: { countryId: true, city: true },
    });
    const citySets = new Map<string, Set<string>>();
    for (const p of profiles) {
      const city = (p.city ?? '').trim();
      if (city.length === 0) continue;
      if (!citySets.has(p.countryId)) citySets.set(p.countryId, new Set());
      citySets.get(p.countryId)!.add(city.toLowerCase());
    }

    const items = grouped
      .map((g) => {
        const meta = countryMap.get(g.countryId);
        if (!meta) return null;
        const specialists = g._count._all;
        return {
          countryId: meta.id,
          code: meta.code,
          nameRu: meta.nameRu,
          specialists,
          citiesRepresented: citySets.get(g.countryId)?.size ?? 0,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.specialists - a.specialists);

    return {
      totalSpecialists: grouped.reduce((s, g) => s + g._count._all, 0),
      items,
    };
  }

  /** Публичный каталог специалистов (профиль создан при регистрации). */
  async specialistsList(dto: SpecialistsListQueryDto) {
    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const userIds = await this.publicSpecialistUserIds();
    if (userIds.length === 0) {
      return { items: [], total: 0, page, pageSize };
    }

    const where: Prisma.ProfileWhereInput = {
      userId: { in: userIds },
    };

    if (dto.countryId) {
      where.countryId = dto.countryId;
    }

    const q = dto.q?.trim();
    if (q && q.length > 0) {
      where.OR = [
        { displayName: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { jobTitle: { nameRu: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, rows] = await Promise.all([
      this.prisma.profile.count({ where }),
      this.prisma.profile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { displayName: 'asc' },
        select: {
          userId: true,
          displayName: true,
          city: true,
          avatarUrl: true,
          country: { select: { id: true, code: true, nameRu: true } },
          jobTitle: { select: { id: true, nameRu: true } },
        },
      }),
    ]);

    return {
      items: rows,
      total,
      page,
      pageSize,
    };
  }
}
