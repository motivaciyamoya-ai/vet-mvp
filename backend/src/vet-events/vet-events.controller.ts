import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VetEventsService } from './vet-events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateVetEventCommentDto } from './dto/create-vet-event-comment.dto';

@ApiTags('events')
@Controller('events')
export class VetEventsController {
  constructor(private readonly vetEvents: VetEventsService) {}

  @Get()
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.vetEvents.list(from, to);
  }

  @Get('comments/:eventId')
  eventComments(@Param('eventId') eventId: string) {
    return this.vetEvents.commentsForEvent(eventId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('comments/:eventId')
  addEventComment(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVetEventCommentDto,
  ) {
    return this.vetEvents.addComment(eventId, user.id, dto.body);
  }

  /** Совместимость: старые клиенты могли ожидать суффикс /comments после id */
  @Get(':eventId/comments')
  eventCommentsLegacy(@Param('eventId') eventId: string) {
    return this.vetEvents.commentsForEvent(eventId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post(':eventId/comments')
  addEventCommentLegacy(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateVetEventCommentDto,
  ) {
    return this.vetEvents.addComment(eventId, user.id, dto.body);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.vetEvents.byId(id);
  }
}
