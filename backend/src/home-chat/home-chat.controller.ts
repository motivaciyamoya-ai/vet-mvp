import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { HomeChatService } from './home-chat.service';
import { PostLobbyMessageDto } from './dto/post-lobby-message.dto';
import { LobbyReactDto } from './dto/lobby-react.dto';

@ApiTags('home-chat')
@Controller('home-chat')
export class HomeChatController {
  constructor(private readonly chat: HomeChatService) {}

  /** Список последних сообщений лобби (главная). Только с JWT. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('messages')
  messages(@CurrentUser() user: AuthUser) {
    return this.chat.listMessages(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('messages')
  post(@CurrentUser() user: AuthUser, @Body() dto: PostLobbyMessageDto) {
    return this.chat.postMessage(user.id, dto.body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('messages/:messageId/react')
  react(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
    @Body() dto: LobbyReactDto,
  ) {
    return this.chat.toggleReaction(user.id, messageId, dto.emoji);
  }
}
