import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const KEY_REGISTRATION_CLOSED = 'site.security.registration_closed';
const KEY_DM_VERIFIED = 'site.security.dm_requires_verified';
const KEY_VERIFIED_FOR_CONTENT = 'site.security.verified_email_required_to_message';
const KEY_REQUIRE_ADMIN_TOTP = 'site.security.require_admin_totp';

@Injectable()
export class SecurityPoliciesService {
  private cache = new Map<string, { v: string | null; at: number }>();
  private readonly ttlMs = 5000;

  constructor(private readonly prisma: PrismaService) {}

  private async raw(key: string): Promise<string | null> {
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && now - hit.at < this.ttlMs) return hit.v;
    const row = await this.prisma.siteSetting.findUnique({ where: { key } });
    const v = row?.value ?? null;
    this.cache.set(key, { v, at: now });
    return v;
  }

  private async isTruthy(key: string): Promise<boolean> {
    const v = (await this.raw(key))?.trim().toLowerCase() ?? '';
    return v === 'true' || v === '1' || v === 'yes';
  }

  invalidateCache() {
    this.cache.clear();
  }

  async registrationClosed(): Promise<boolean> {
    return this.isTruthy(KEY_REGISTRATION_CLOSED);
  }

  async dmRequiresVerifiedEmail(): Promise<boolean> {
    return this.isTruthy(KEY_DM_VERIFIED);
  }

  /** Личные сообщения, лобби и форум (новые темы/ответы). */
  async contentRequiresVerifiedEmail(): Promise<boolean> {
    return (await this.isTruthy(KEY_VERIFIED_FOR_CONTENT)) || (await this.isTruthy(KEY_DM_VERIFIED));
  }

  async assertUserVerifiedForContent(userId: string) {
    if (!(await this.contentRequiresVerifiedEmail())) return;
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });
    if (!u?.emailVerified) {
      throw new ForbiddenException(
        'Требуется подтверждённый email для публикации сообщений и постов (настройка безопасности сайта).',
      );
    }
  }

  /**
   * Если ключ не задан: в production — требовать TOTP для админки; в dev — нет (удобство локальной разработки).
   */
  async requireAdminTotp(): Promise<boolean> {
    const v = await this.raw(KEY_REQUIRE_ADMIN_TOTP);
    if (v == null || v.trim() === '') {
      return process.env.NODE_ENV === 'production';
    }
    const t = v.trim().toLowerCase();
    return t === 'true' || t === '1' || t === 'yes';
  }
}
