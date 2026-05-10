import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsConfigService } from './uploads-config.service';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  controllers: [UploadsController],
  providers: [UploadsConfigService],
  exports: [UploadsConfigService],
})
export class UploadsModule {}
