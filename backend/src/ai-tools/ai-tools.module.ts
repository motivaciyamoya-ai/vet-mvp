import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModerationModule } from '../moderation/moderation.module';
import { AiToolsController } from './ai-tools.controller';
import { AiToolsService } from './ai-tools.service';

@Module({
  imports: [ConfigModule, ModerationModule],
  controllers: [AiToolsController],
  providers: [AiToolsService],
})
export class AiToolsModule {}

