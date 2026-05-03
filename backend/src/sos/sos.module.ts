import { Module } from '@nestjs/common';
import { SosService } from './sos.service';
import { SosController } from './sos.controller';
import { PushModule } from '../push/push.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [PushModule, ModerationModule],
  controllers: [SosController],
  providers: [SosService],
})
export class SosModule {}
