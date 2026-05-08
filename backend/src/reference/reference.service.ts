import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SpecialistsListQueryDto } from './dto/specialists-query.dto';
import type { PublicSiteSeoDto } from './dto/public-site-seo.dto';

const SEO_DEFAULT_SITE_NAME = 'VetConnect';

const SEO_DEFAULT_HOME_SEGMENT = 'Ветеринарное сообщество и инструменты';

const SEO_DEFAULT_META_DESCRIPTION =
  'VetConnect — профессиональная платформа для ветеринарных специалистов: форум, статьи, маркетплейс, мероприятия и AI‑инструменты для поддержки диагностики.';

const SEO_DEFAULT_META_KEYWORDS =
  'ветеринар, ветеринарный форум, ветеринарные статьи, ветеринарные мероприятия, рентген, УЗИ, AI диагностика';

const SEO_DEFAULT_OG_DESCRIPTION =
  'Форум, статьи, маркетплейс, календарь мероприятий и AI‑инструменты для ветеринарных специалистов.';

/** Только чтобы собрать абсолютный og:image для относительных путей, если админ не задал canonical origin. */
const SEO_FALLBACK_ORIGIN_FOR_ASSETS = 'https://vetconnect.online';

const SEO_DEFAULT_THEME = '#059669';

function seoPick(map: Record<string, string>, key: string): string {
  return (map[key] ?? '').trim();
}

function normalizeTwitterCard(raw: string): 'summary' | 'summary_large_image' {
  const v = raw.trim().toLowerCase();
  return v === 'summary_large_image' ? 'summary_large_image' : 'summary';
}

function normalizeHexColor(raw: string): string {
  const t = raw.trim();
  if (!t) return SEO_DEFAULT_THEME;
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i.test(t)) return t;
  if (/^[0-9a-f]{3}([0-9a-f]{3})?([0-9a-f]{2})?$/i.test(t)) return `#${t}`;
  return SEO_DEFAULT_THEME;
}

function resolveAbsoluteUrl(originBase: string, candidate: string): string | null {
  const c = candidate.trim();
  if (!c) return null;
  if (/^https?:\/\//i.test(c)) return c;
  const origin = originBase.replace(/\/+$/, '');
  const path = c.startsWith('/') ? c : `/${c}`;
  return `${origin}${path}`;
}

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

  /**
   * Публичные SEO-поля для SPA: значения берутся из SiteSetting (`seo.*`), при отсутствии ключей — безопасные умолчанию.
   */
  async getPublicSiteSeo(): Promise<PublicSiteSeoDto> {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { startsWith: 'seo.' } },
      select: { key: true, value: true },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const siteName = seoPick(map, 'seo.site_name') || SEO_DEFAULT_SITE_NAME;

    const homeExplicit = seoPick(map, 'seo.home_page_title');
    const homeDocumentTitle = homeExplicit.length
      ? homeExplicit
      : `${SEO_DEFAULT_HOME_SEGMENT} · ${siteName}`;

    const metaDescription = seoPick(map, 'seo.meta_description') || SEO_DEFAULT_META_DESCRIPTION;
    const metaKeywords = seoPick(map, 'seo.meta_keywords') || SEO_DEFAULT_META_KEYWORDS;

    const ogSiteName = seoPick(map, 'seo.og_site_name') || siteName;

    const ogTitleRaw = seoPick(map, 'seo.og_title');

    const ogDescription = seoPick(map, 'seo.og_description') || SEO_DEFAULT_OG_DESCRIPTION;

    const canonicalOriginExplicit = seoPick(map, 'seo.canonical_origin');
    const canonicalOrigin =
      canonicalOriginExplicit.length > 0
        ? canonicalOriginExplicit.replace(/\/+$/, '')
        : null;

    const originForAssets = canonicalOrigin ?? SEO_FALLBACK_ORIGIN_FOR_ASSETS;

    const ogImageRaw = seoPick(map, 'seo.og_image');
    const ogImageAbsolute =
      resolveAbsoluteUrl(originForAssets, ogImageRaw.length ? ogImageRaw : '/favicon.svg') ??
      resolveAbsoluteUrl(originForAssets, '/favicon.svg');

    const themeColor = normalizeHexColor(seoPick(map, 'seo.theme_color'));

    const twitterCard = normalizeTwitterCard(seoPick(map, 'seo.twitter_card'));

    return {
      siteName,
      homeDocumentTitle,
      metaDescription,
      metaKeywords,
      ogSiteName,
      ogTitle: ogTitleRaw.length ? ogTitleRaw : null,
      ogDescription,
      ogImageAbsolute,
      canonicalOrigin,
      themeColor,
      twitterCard,
    };
  }

  async getPublicMaintenance(): Promise<{
    enabled: boolean;
    title: string;
    message: string;
    updatedAt: string | null;
  }> {
    const keys = [
      'site.maintenance.enabled',
      'site.maintenance.title',
      'site.maintenance.message',
    ] as const;

    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { in: [...keys] } },
      select: { key: true, value: true, updatedAt: true },
    });
    const map = new Map(rows.map((r) => [r.key, r]));

    const enabledRaw = (map.get('site.maintenance.enabled')?.value ?? '').trim().toLowerCase();
    const enabled = enabledRaw === '1' || enabledRaw === 'true' || enabledRaw === 'on' || enabledRaw === 'yes';

    const title = (map.get('site.maintenance.title')?.value ?? '').trim() || 'Технические работы';
    const message =
      (map.get('site.maintenance.message')?.value ?? '').trim() ||
      'Мы обновляем сервис. Пожалуйста, зайдите чуть позже.';

    const updatedAt =
      map.get('site.maintenance.enabled')?.updatedAt?.toISOString?.() ??
      map.get('site.maintenance.title')?.updatedAt?.toISOString?.() ??
      map.get('site.maintenance.message')?.updatedAt?.toISOString?.() ??
      null;

    return { enabled, title, message, updatedAt };
  }
}
