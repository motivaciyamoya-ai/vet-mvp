import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { VetcoinModule } from '../vetcoin/vetcoin.module';
import { DosageDrugsModule } from '../dosage-drugs/dosage-drugs.module';
import { VetEventsModule } from '../vet-events/vet-events.module';
import { ModerationModule } from '../moderation/moderation.module';
import { LiveTrafficModule } from '../live-traffic/live-traffic.module';

@Module({
  imports: [VetcoinModule, DosageDrugsModule, VetEventsModule, ModerationModule, LiveTrafficModule],
  controllers: [AdminController],
  providers: [AdminService, AdminDashboardService],
  exports: [AdminService, AdminDashboardService],
})
export class AdminModule {}
