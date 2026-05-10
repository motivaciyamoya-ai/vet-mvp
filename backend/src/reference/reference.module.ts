import { Module } from '@nestjs/common';
import { ReferenceController } from './reference.controller';
import { ReferenceService } from './reference.service';
import { ForumModule } from '../forum/forum.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [ForumModule, UploadsModule],
  controllers: [ReferenceController],
  providers: [ReferenceService],
})
export class ReferenceModule {}
