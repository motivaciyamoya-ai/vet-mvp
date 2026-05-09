import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModerationModule } from '../moderation/moderation.module';
import { VetcoinModule } from '../vetcoin/vetcoin.module';
import { AiToolsController } from './ai-tools.controller';
import { AiToolsService } from './ai-tools.service';

@Module({
  imports: [ConfigModule, ModerationModule, VetcoinModule],
  controllers: [AiToolsController],
  providers: [AiToolsService],
})
export class AiToolsModule {}

