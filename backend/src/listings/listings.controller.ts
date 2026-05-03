import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ListingType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateListingMessageDto } from './dto/create-listing-message.dto';
import { MarkListingSoldDto } from './dto/mark-listing-sold.dto';

@ApiTags('listings')
@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  list(
    @Query('type') type?: ListingType,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.listings.list(
      type,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.listings.byId(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateListingDto) {
    return this.listings.create(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post(':id/mark-sold')
  markSold(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MarkListingSoldDto,
  ) {
    return this.listings.markSold(id, user.id, dto.buyerUserId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post(':id/messages')
  message(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateListingMessageDto,
  ) {
    return this.listings.addMessage(id, user.id, dto.body);
  }
}
