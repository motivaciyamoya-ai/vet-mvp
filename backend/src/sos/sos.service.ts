import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SosStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { CreateSosDto } from './dto/create-sos.dto';

@Injectable()
export class SosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async create(authorId: string, dto: CreateSosDto) {
    const sos = await this.prisma.sosRequest.create({
      data: {
        authorId,
        body: dto.body,
        animalKind: dto.animalKind,
        urgency: dto.urgency ?? undefined,
        region: dto.region,
      },
    });
    await this.push.notifyNewSos(sos);
    return sos;
  }

  active() {
    return this.prisma.sosRequest.findMany({
      where: { status: SosStatus.OPEN },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        author: { select: { id: true, profile: { include: { country: true } } } },
      },
    });
  }

  async updateStatus(id: string, userId: string, role: UserRole, status: SosStatus) {
    const sos = await this.prisma.sosRequest.findUnique({ where: { id } });
    if (!sos) throw new NotFoundException();
    const isMod = role === UserRole.MODERATOR || role === UserRole.ADMIN;
    const isAuthor = sos.authorId === userId;
    if (!isMod && !isAuthor) throw new ForbiddenException();
    if (!isMod && isAuthor && status === SosStatus.IN_PROGRESS) {
      throw new ForbiddenException('Только модератор может перевести в IN_PROGRESS');
    }
    return this.prisma.sosRequest.update({
      where: { id },
      data: { status },
    });
  }
}
