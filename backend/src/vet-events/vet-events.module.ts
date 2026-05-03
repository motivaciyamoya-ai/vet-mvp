import { Module } from '@nestjs/common';
import { VetEventsService } from './vet-events.service';
import { VetEventsController } from './vet-events.controller';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  controllers: [VetEventsController],
  providers: [VetEventsService],
  exports: [VetEventsService],
})
export class VetEventsModule {}
