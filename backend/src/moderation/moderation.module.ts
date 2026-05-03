import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationGuard } from './moderation.guard';

@Module({
  providers: [ModerationService, ModerationGuard],
  exports: [ModerationService, ModerationGuard],
})
export class ModerationModule {}
