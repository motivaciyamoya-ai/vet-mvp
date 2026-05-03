import { Module } from '@nestjs/common';
import { VetEventsService } from './vet-events.service';
import { VetEventsController } from './vet-events.controller';

@Module({
  controllers: [VetEventsController],
  providers: [VetEventsService],
  exports: [VetEventsService],
})
export class VetEventsModule {}
