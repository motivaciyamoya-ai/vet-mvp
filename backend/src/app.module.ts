import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'medium', ttl: 60000, limit: 120 },
    ]),
    PrismaModule,
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
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
