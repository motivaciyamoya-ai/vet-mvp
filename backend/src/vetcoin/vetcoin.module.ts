import { Module } from '@nestjs/common';
import { VetcoinService } from './vetcoin.service';

@Module({
  providers: [VetcoinService],
  exports: [VetcoinService],
})
export class VetcoinModule {}
