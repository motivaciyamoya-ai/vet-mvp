import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { VeterateThrottlerGuard } from './common/guards/veterate-throttler.guard';
import { SecurityModule } from './security/security.module';
import { AuditModule } from './audit/audit.module';
import { AlertsModule } from './alerts/alerts.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReferenceModule } from './reference/reference.module';
import { ForumModule } from './forum/forum.module';
import { ArticlesModule } from './articles/articles.module';
import { ReportsModule } from './reports/reports.module';
import { ListingsModule } from './listings/listings.module';
import { SosModule } from './sos/sos.module';
import { PushModule } from './push/push.module';
import { CalculatorsModule } from './calculators/calculators.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './uploads/uploads.module';
import { ProfilesModule } from './profiles/profiles.module';
import { MessagesModule } from './messages/messages.module';
import { DosageDrugsModule } from './dosage-drugs/dosage-drugs.module';
import { HomeChatModule } from './home-chat/home-chat.module';
import { VetEventsModule } from './vet-events/vet-events.module';
import { ModerationModule } from './moderation/moderation.module';
import { AiToolsModule } from './ai-tools/ai-tools.module';
import { MetricsModule } from './metrics/metrics.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { throttlerSkipIfBypass } from './common/utils/throttle-bypass';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      /** Раньше 20/сек легко съедалось пачкой auth_request + вкладкой админки. */
      { name: 'short', ttl: 1000, limit: 80, skipIf: throttlerSkipIfBypass },
      { name: 'medium', ttl: 60000, limit: 120, skipIf: throttlerSkipIfBypass },
      { name: 'login', ttl: 60_000, limit: 10, skipIf: throttlerSkipIfBypass },
    ]),
    PrismaModule,
    SecurityModule,
    AuditModule,
    AlertsModule,
    AuthModule,
    UsersModule,
    ReferenceModule,
    ForumModule,
    ArticlesModule,
    ReportsModule,
    ListingsModule,
    SosModule,
    PushModule,
    CalculatorsModule,
    HealthModule,
    AdminModule,
    UploadsModule,
    ProfilesModule,
    MessagesModule,
    DosageDrugsModule,
    HomeChatModule,
    VetEventsModule,
    ModerationModule,
    AiToolsModule,
    MetricsModule,
    MonitoringModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: VeterateThrottlerGuard }],
})
export class AppModule {}
