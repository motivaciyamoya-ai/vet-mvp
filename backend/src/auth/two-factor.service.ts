import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  async setupTotp(userId: string) {
    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret, totpEnabled: false },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const email = user?.email ?? 'user';
    const otpauthUrl = generateURI({
      issuer: 'VetConnect',
      label: email,
      secret,
    });
    return { otpauthUrl };
  }

  async enableTotp(userId: string, code: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true },
    });
    if (!u?.totpSecret) throw new BadRequestException('Сначала запросите настройку 2FA.');
    const result = verifySync({ secret: u.totpSecret, token: code.trim() });
    if (!result.valid) throw new UnauthorizedException('Неверный код подтверждения.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true },
    });
    return { ok: true as const };
  }

  async disableTotp(userId: string, password: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!u) throw new UnauthorizedException();
    const passwordOk = await bcrypt.compare(password, u.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Неверный пароль.');
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: false, totpSecret: null },
    });
    return { ok: true as const };
  }

  verifyCode(secret: string | null | undefined, code: string | undefined): boolean {
    if (!secret || !code?.trim()) return false;
    return verifySync({ secret, token: code.trim() }).valid;
  }
}
