import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';
import { VetcoinModule } from '../vetcoin/vetcoin.module';
import { ModerationModule } from '../moderation/moderation.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [VetcoinModule, JwtModule.register({}), ModerationModule, UploadsModule],
  controllers: [ForumController],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
