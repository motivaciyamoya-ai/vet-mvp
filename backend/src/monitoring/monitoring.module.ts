import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';

import { MonitoringController } from './monitoring.controller';



@Module({

  imports: [JwtModule.register({})],

  controllers: [MonitoringController],

})

export class MonitoringModule {}

