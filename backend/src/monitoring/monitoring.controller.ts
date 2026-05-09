import { Controller, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminTotpGuard } from '../admin/guards/admin-totp.guard';
import { SkipThrottle } from '@nestjs/throttler';

const COOKIE_NAME = 'vet_monitoring';

@Controller()
export class MonitoringController {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Called from the Admin UI (with Bearer token) to mint an httpOnly cookie
   * that nginx auth_request can validate (because iframe requests don't carry Bearer headers).
   */
  @UseGuards(JwtAuthGuard, RolesGuard, AdminTotpGuard)
  @Roles(UserRole.ADMIN)
  @SkipThrottle()
  @Post('admin/monitoring/session')
  mintSession(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const u = (req as any).user as { id: string; role: string } | undefined;
    const token = this.jwt.sign(
      { sub: u?.id ?? 'admin', role: 'ADMIN', kind: 'monitoring' },
      {
        secret: this.accessSecret(),
        expiresIn: '12h',
      },
    );
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 12 * 60 * 60 * 1000,
    });
    return { ok: true };
  }

  /** Called by nginx auth_request for /grafana and /prometheus access. */
  @SkipThrottle()
  @Get('monitoring/auth')
  auth(@Req() req: Request) {
    const token = (req.cookies?.[COOKIE_NAME] as string | undefined) ?? '';
    if (!token) throw new UnauthorizedException();
    try {
      const payload = this.jwt.verify(token, {
        secret: this.accessSecret(),
      }) as any;
      if (payload?.role !== 'ADMIN' || payload?.kind !== 'monitoring') throw new UnauthorizedException();
      return { ok: true };
    } catch {
      throw new UnauthorizedException();
    }
  }

  private accessSecret(): string {
    return process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
  }
}

