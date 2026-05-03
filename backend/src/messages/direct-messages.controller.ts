import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { DirectMessagesService } from './direct-messages.service';
import { OpenConversationDto, SendDirectMessageDto } from './dto/send-direct-message.dto';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class DirectMessagesController {
  constructor(private readonly dm: DirectMessagesService) {}

  @Get('unread-summary')
  unread(@CurrentUser() user: AuthUser) {
    return this.dm.unreadTotal(user.id);
  }

  @Get('conversations')
  conversations(@CurrentUser() user: AuthUser) {
    return this.dm.listConversations(user.id);
  }

  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('conversations/with/:peerUserId')
  open(
    @CurrentUser() user: AuthUser,
    @Param('peerUserId') peerUserId: string,
    @Body() dto: OpenConversationDto,
  ) {
    return this.dm.openConversation(user.id, peerUserId, dto.initialBody);
  }

  @Get('conversations/:conversationId/messages')
  messages(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
  ) {
    return this.dm.listMessages(conversationId, user.id);
  }

  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('conversations/:conversationId/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendDirectMessageDto,
  ) {
    return this.dm.send(conversationId, user.id, dto.body);
  }

  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Patch('conversations/:conversationId/read')
  read(@CurrentUser() user: AuthUser, @Param('conversationId') conversationId: string) {
    return this.dm.markRead(conversationId, user.id);
  }
}
