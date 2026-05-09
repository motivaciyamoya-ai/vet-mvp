import { Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminTotpGuard } from '../admin/guards/admin-totp.guard';
import { SkipThrottle } from '@nestjs/throttler';
import { MONITORING_COOKIE_NAME, monitoringAccessSecret } from './monitoring-auth.shared';

@SkipThrottle({ short: true, medium: true, login: true })
@Controller()
export class MonitoringController {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Called from the Admin UI (with Bearer token) to mint an httpOnly cookie
   * that nginx auth_request can validate (because iframe requests don't carry Bearer headers).
   */
  @UseGuards(JwtAuthGuard, RolesGuard, AdminTotpGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/monitoring/session')
  mintSession(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const u = (req as any).user as { id: string; role: string } | undefined;
    const token = this.jwt.sign(
      { sub: u?.id ?? 'admin', role: 'ADMIN', kind: 'monitoring' },
      {
        secret: monitoringAccessSecret(),
        expiresIn: '12h',
      },
    );
    res.cookie(MONITORING_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 12 * 60 * 60 * 1000,
    });
    return { ok: true };
  }

  /**
   * GET-проверки cookie для Grafana: см. MONITORING_AUTH_GET_PATHS + middleware в main.ts (до Nest).
   */

}

