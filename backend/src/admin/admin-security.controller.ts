import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityPoliciesService } from '../security/security-policies.service';

@ApiTags('admin-security')
@ApiBearerAuth()
@SkipThrottle({ short: true, medium: true, login: true })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/security')
export class AdminSecurityController {
  constructor(
    private readonly audit: AuditService,
    private readonly prisma: PrismaService,
    private readonly policies: SecurityPoliciesService,
  ) {}

  @Get('audit')
  auditLog(@Query('take') take?: string) {
    const n = parseInt(String(take ?? '80'), 10);
    return this.audit.listRecent(Number.isFinite(n) ? n : 80);
  }

  @Get('flags')
  async securityFlags() {
    return {
      registrationClosed: await this.policies.registrationClosed(),
      dmRequiresVerified: await this.policies.dmRequiresVerifiedEmail(),
      contentRequiresVerifiedEmail: await this.policies.contentRequiresVerifiedEmail(),
      requireAdminTotp: await this.policies.requireAdminTotp(),
    };
  }

  @Post('revoke-all-sessions')
  async revokeAllRefreshTokens(@CurrentUser() user: AuthUser) {
    const deleted = await this.prisma.refreshToken.deleteMany({});
    await this.audit.log({
      action: 'admin.security.revoke_all_sessions',
      actorUserId: user.id,
      actorEmail: user.email,
      details: { deleted: deleted.count },
    });
    return { ok: true as const, deletedRefreshTokens: deleted.count };
  }
}
