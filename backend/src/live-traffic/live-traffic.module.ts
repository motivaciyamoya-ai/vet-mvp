import { Module } from '@nestjs/common';
import { LiveTrafficService } from './live-traffic.service';

@Module({
  providers: [LiveTrafficService],
  exports: [LiveTrafficService],
})
export class LiveTrafficModule {}
