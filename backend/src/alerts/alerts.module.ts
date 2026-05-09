import { Global, Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { MailConfigService } from './mail-config.service';

@Global()
@Module({
  providers: [MailConfigService, AlertsService],
  exports: [MailConfigService, AlertsService],
})
export class AlertsModule {}
