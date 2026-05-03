import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VetEventsService } from './vet-events.service';

@ApiTags('events')
@Controller('events')
export class VetEventsController {
  constructor(private readonly vetEvents: VetEventsService) {}

  @Get()
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.vetEvents.list(from, to);
  }
}
