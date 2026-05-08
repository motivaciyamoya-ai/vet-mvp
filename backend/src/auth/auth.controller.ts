import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TotpCodeDto, TotpDisableDto } from './dto/two-factor.dto';
import { TwoFactorService } from './two-factor.service';
import { REFRESH_COOKIE_NAME } from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  @Throttle({ login: { limit: 10, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const out = (await this.auth.register(dto, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    })) as { refreshToken?: string } & Record<string, unknown>;
    if (out.refreshToken) this.auth.attachRefreshCookie(res, out.refreshToken);
    return this.auth.maybeStripRefresh(out);
  }

  @Throttle({ login: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const out = (await this.auth.login(dto, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    })) as { refreshToken?: string } & Record<string, unknown>;
    if (out.refreshToken) this.auth.attachRefreshCookie(res, out.refreshToken);
    return this.auth.maybeStripRefresh(out);
  }

  /** Подтверждение email по ссылке из письма / лога сервера. */
  @SkipThrottle()
  @Get('verify-email')
  verifyEmail(@Query('token') token?: string) {
    return this.auth.verifyEmail(token ?? '');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('resend-verification')
  resendVerification(@CurrentUser() user: AuthUser) {
    return this.auth.resendVerification(user.id);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = dto.refreshToken?.trim() || req.cookies?.[REFRESH_COOKIE_NAME];
    const out = (await this.auth.refresh(token)) as { refreshToken?: string } & Record<string, unknown>;
    if (out.refreshToken) this.auth.attachRefreshCookie(res, out.refreshToken);
    return this.auth.maybeStripRefresh(out);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = dto.refreshToken?.trim() || req.cookies?.[REFRESH_COOKIE_NAME];
    await this.auth.logout(token);
    this.auth.clearRefreshCookie(res);
    return { ok: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('2fa/setup')
  setupTotp(@CurrentUser() user: AuthUser) {
    return this.twoFactor.setupTotp(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('2fa/enable')
  enableTotp(@CurrentUser() user: AuthUser, @Body() dto: TotpCodeDto) {
    return this.twoFactor.enableTotp(user.id, dto.code);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('2fa/disable')
  disableTotp(@CurrentUser() user: AuthUser, @Body() dto: TotpDisableDto) {
    return this.twoFactor.disableTotp(user.id, dto.password);
  }
}
