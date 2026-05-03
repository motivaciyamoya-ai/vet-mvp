import { Module } from '@nestjs/common';
import { HomeChatService } from './home-chat.service';
import { HomeChatController } from './home-chat.controller';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  controllers: [HomeChatController],
  providers: [HomeChatService],
})
export class HomeChatModule {}
