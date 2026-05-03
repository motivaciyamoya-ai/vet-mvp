import { Module } from '@nestjs/common';
import { DosageDrugsService } from './dosage-drugs.service';
import { DosageDrugsController } from './dosage-drugs.controller';

@Module({
  controllers: [DosageDrugsController],
  providers: [DosageDrugsService],
  exports: [DosageDrugsService],
})
export class DosageDrugsModule {}
