import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { SosService } from './sos.service';
import { CreateSosDto } from './dto/create-sos.dto';
import { UpdateSosDto } from './dto/update-sos.dto';

@ApiTags('sos')
@Controller('sos')
export class SosController {
  constructor(private readonly sos: SosService) {}

  @Get('active')
  active() {
    return this.sos.active();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSosDto) {
    return this.sos.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSosDto,
  ) {
    return this.sos.updateStatus(id, user.id, user.role as UserRole, dto.status);
  }
}
