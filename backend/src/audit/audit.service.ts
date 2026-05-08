import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditDetails = Prisma.InputJsonValue;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    action: string;
    actorUserId?: string | null;
    actorEmail?: string | null;
    details?: AuditDetails;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          actorUserId: input.actorUserId ?? undefined,
          actorEmail: input.actorEmail ?? undefined,
          details: input.details === undefined ? undefined : (input.details as Prisma.InputJsonValue),
          ip: input.ip ?? undefined,
          userAgent: input.userAgent ?? undefined,
        },
      });
    } catch {
      /* не валим запрос из-за аудита */
    }
  }

  async listRecent(take: number) {
    const n = Math.min(Math.max(take, 1), 200);
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: n,
      select: {
        id: true,
        createdAt: true,
        action: true,
        actorUserId: true,
        actorEmail: true,
        details: true,
        ip: true,
        userAgent: true,
      },
    });
  }
}
