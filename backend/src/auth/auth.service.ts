import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';
import { UserRole } from '@prisma/client';
import { VetcoinService } from '../vetcoin/vetcoin.service';
import { assertBirthDateReasonable, parseBirthDateLocal } from '../common/profile-birth.util';

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly vetcoin: VetcoinService,
  ) {}

  private accessSecret() {
    return this.config.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret';
  }

  private jwtAccessExpiresIn(): string {
    const raw = `${this.config.get<string>('JWT_ACCESS_EXPIRES') ?? ''}`.trim();
    return raw || '15m';
  }

  private refreshTtlMs(): number {
    const raw = this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d';
    if (raw.endsWith('d')) {
      const n = parseInt(raw, 10);
      return (Number.isFinite(n) ? n : 7) * 86400000;
    }
    if (raw.endsWith('h')) {
      const n = parseInt(raw, 10);
      return (Number.isFinite(n) ? n : 168) * 3600000;
    }
    return 7 * 86400000;
  }

  private frontendBaseUrl() {
    return (this.config.get<string>('FRONTEND_URL') || 'http://localhost:5173').replace(/\/$/, '');
  }

  private printVerificationHint(emailNorm: string, token: string) {
    const url = `${this.frontendBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    this.log.warn(`Подтвердите email (${emailNorm}): ${url}`);
  }

  private async issueTokens(userId: string, email: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, email, role };
    const expiresIn = this.jwtAccessExpiresIn();
    let accessToken: string;
    try {
      accessToken = await this.jwt.signAsync(payload, {
        secret: this.accessSecret(),
        expiresIn,
      });
    } catch (e: unknown) {
      this.log.error(
        `JWT подпись access-токена не удалась (JWT_ACCESS_EXPIRES="${expiresIn}").`,
        e instanceof Error ? e.stack : e,
      );
      throw new InternalServerErrorException(
        `Сервер: проверьте переменную JWT_ACCESS_EXPIRES в .env — допустимо, например, «15m» или «24h». Сейчас: "${expiresIn}".`,
      );
    }
    const refreshToken = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());
    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt },
    });
    return { accessToken, refreshToken, expiresAt };
  }

  async register(dto: RegisterDto) {
    const emailNorm = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email: emailNorm } });
    if (exists) throw new ConflictException('Email уже зарегистрирован');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const birthDate = parseBirthDateLocal(dto.birthDate);
    assertBirthDateReasonable(birthDate);

    const user = await this.prisma.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        emailVerified: false,
        policyAcceptedAt: new Date(),
        policyVersion: '1.0',
        role: UserRole.SPECIALIST,
        profile: {
          create: {
            displayName: dto.displayName,
            city: dto.city,
            countryId: dto.countryId,
            jobTitleId: dto.jobTitleId,
            birthDate,
          },
        },
      },
    });

    const verifyToken = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verifyToken,
        expiresAt: new Date(Date.now() + 72 * 3600000),
      },
    });
    this.printVerificationHint(emailNorm, verifyToken);

    try {
      const bonus = await this.vetcoin.settingInt('vetcoin.registration_bonus', 50);
      if (bonus > 0) {
        await this.vetcoin.applyDelta(user.id, bonus, 'Бонус за регистрацию');
      }
    } catch (e: unknown) {
      this.log.warn(`VetCoin registration bonus skipped: ${e instanceof Error ? e.message : e}`);
    }

    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerified },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const emailNorm = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: emailNorm } });
    if (!user) throw new UnauthorizedException('Неверный email или пароль');

    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    } catch (e: unknown) {
      this.log.warn(
        `bcrypt.compare ошибка (${emailNorm}): возможен битый passwordHash — выполните npm run seed.`,
        e instanceof Error ? e.message : e,
      );
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!passwordOk) throw new UnauthorizedException('Неверный email или пароль');
    const tokens = await this.issueTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const row = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('Недействительный refresh-токен');
    }
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    return this.issueTokens(row.user.id, row.user.email, row.user.role);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { ok: true };
  }

  async verifyEmail(tokenRaw: string) {
    const token = tokenRaw?.trim();
    if (!token) throw new BadRequestException('Токен обязателен');
    const row = await this.prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!row || row.expiresAt < new Date()) {
      throw new BadRequestException('Ссылка недействительна или истекла');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.delete({ where: { userId: row.userId } }),
    ]);
    return { ok: true };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) {
      return { ok: true, skipped: true };
    }
    const vt = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token: vt,
        expiresAt: new Date(Date.now() + 72 * 3600000),
      },
    });
    this.printVerificationHint(user.email, vt);
    return { ok: true };
  }
}