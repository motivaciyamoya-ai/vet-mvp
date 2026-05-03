import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  /** Состояние относительно залогиненного пользователя: благодарность, есть ли уже диалог. */
  @Get(':userId/viewer-relation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  viewerRelation(@Param('userId') targetUserId: string, @CurrentUser() user: AuthUser) {
    return this.profiles.viewerRelation(user.id, targetUserId);
  }

  @Post(':userId/thank')
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @ApiBearerAuth()
  thank(@Param('userId') toUserId: string, @CurrentUser() user: AuthUser) {
    return this.profiles.thank(user.id, toUserId);
  }

  /** Без авторизации — публичная карточка и статистика (email и баланс не отдаём). */
  @Get(':userId')
  @ApiOperation({ summary: 'Публичный профиль участника и агрегированная активность' })
  publicCard(@Param('userId') userId: string) {
    return this.profiles.publicProfile(userId);
  }
}
