import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
