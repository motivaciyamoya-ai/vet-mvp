import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ModerationService } from './moderation.service';

/** Блокирует мутации для TEMP_SUSPENDED/BANNED; GET остаются доступными. */
@Injectable()
export class ModerationGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const method = String(req.method || 'GET').toUpperCase();

    // Только авторизованные маршруты (JwtAuthGuard обычно идёт раньше и кладёт user).
    const user = req.user as AuthUser | undefined;
    if (!user?.id) return true;

    if (user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) {
      return true;
    }

    const path = String(req.originalUrl ?? req.url ?? '');
    const isAuthMaintain =
      path.startsWith('/api/auth/refresh') || path.startsWith('/api/auth/logout');

    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    // Разрешаем поддерживать сессию техническими эндпоинтами, даже если аккаунт в бане
    // (иначе пользователь может «застрять» без возможности получить понятную ошибку на /me).
    if (isAuthMaintain) return true;

    await this.moderation.maybeClearExpiredSanctions(user.id);

    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        moderationStatus: true,
        moderationUntil: true,
      },
    });
    if (!row) return true;

    this.moderation.assertCanMutate(user.role, row);

    return true;
  }
}
