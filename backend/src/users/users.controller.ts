import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SpendVetcoinsDto } from './dto/spend-vetcoins.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.me(user.id);
  }

  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Get('me/vetcoins')
  myVetcoins(@CurrentUser() user: AuthUser) {
    return this.users.myVetcoins(user.id);
  }

  /** Созданные темы и ответы на форуме — для автоматических ярлыков-достижений на клиенте */
  @Get('me/forum-stats')
  myForumStats(@CurrentUser() user: AuthUser) {
    return this.users.forumActivity(user.id);
  }

  @Get('me/notifications')
  myNotifications(@CurrentUser() user: AuthUser) {
    return this.users.notifications(user.id);
  }

  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Patch('me/notifications/:notificationId/read')
  markNotification(
    @CurrentUser() user: AuthUser,
    @Param('notificationId') notificationId: string,
  ) {
    return this.users.markNotificationRead(user.id, notificationId);
  }

  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('me/notifications/read-all')
  markAllNotifications(@CurrentUser() user: AuthUser) {
    return this.users.markAllNotificationsRead(user.id);
  }

  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Delete('me/notifications/:notificationId')
  removeNotification(
    @CurrentUser() user: AuthUser,
    @Param('notificationId') notificationId: string,
  ) {
    return this.users.deleteNotification(user.id, notificationId);
  }

  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('me/vetcoins/spend')
  spendVetcoins(@CurrentUser() user: AuthUser, @Body() dto: SpendVetcoinsDto) {
    return this.users.spendVetcoins(user.id, dto);
  }
}
