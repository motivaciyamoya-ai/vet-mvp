import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { VetcoinModule } from '../vetcoin/vetcoin.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [VetcoinModule, ModerationModule],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
