import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SecurityPoliciesService } from '../../security/security-policies.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AdminTotpGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policies: SecurityPoliciesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = req.user;
    if (!user || user.role !== UserRole.ADMIN) {
      return true;
    }
    if (!(await this.policies.requireAdminTotp())) {
      return true;
    }
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { totpEnabled: true },
    });
    if (row?.totpEnabled) return true;
    throw new ForbiddenException(
      'Для доступа к админке включите двухфакторную аутентификацию (раздел «Безопасность»).',
    );
  }
}
