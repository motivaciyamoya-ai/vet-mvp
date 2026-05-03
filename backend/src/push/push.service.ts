import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SosRequest } from '@prisma/client';

@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, token: string, platform: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
  }

  /** Заглушка: в проде — вызов FCM HTTP v1 */
  async notifyNewSos(sos: SosRequest) {
    const tokens = await this.prisma.pushToken.findMany({ take: 100 });
    // eslint-disable-next-line no-console
    console.log(
      `[push:stub] SOS id=${sos.id} urgency=${sos.urgency} region=${sos.region ?? 'n/a'} → devices=${tokens.length}`,
    );
    return { notifiedDevices: tokens.length };
  }
}
