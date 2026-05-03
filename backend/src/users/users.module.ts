import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { VetcoinModule } from '../vetcoin/vetcoin.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [VetcoinModule, ModerationModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
