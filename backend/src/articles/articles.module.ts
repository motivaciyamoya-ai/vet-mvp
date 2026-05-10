import { Module } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ArticlesController } from './articles.controller';
import { ModerationModule } from '../moderation/moderation.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [ModerationModule, UploadsModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
