import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminSecurityController } from './admin-security.controller';
import { AdminService } from './admin.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { VetcoinModule } from '../vetcoin/vetcoin.module';
import { DosageDrugsModule } from '../dosage-drugs/dosage-drugs.module';
import { VetEventsModule } from '../vet-events/vet-events.module';
import { ModerationModule } from '../moderation/moderation.module';
import { LiveTrafficModule } from '../live-traffic/live-traffic.module';
import { AdminTotpGuard } from './guards/admin-totp.guard';
import { AdminAiToolsService } from './admin-ai-tools.service';

@Module({
  imports: [
    VetcoinModule,
    DosageDrugsModule,
    VetEventsModule,
    ModerationModule,
    LiveTrafficModule,
  ],
  controllers: [AdminController, AdminSecurityController],
  providers: [AdminService, AdminDashboardService, AdminTotpGuard, AdminAiToolsService],
  exports: [AdminService, AdminDashboardService, AdminAiToolsService],
})
export class AdminModule {}
