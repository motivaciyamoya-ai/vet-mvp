import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { AiToolsService } from './ai-tools.service';

type MulterMemFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const MAX_FILES = 6;
const MAX_FILE_MB = 12;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

function normalizeKind(v: string | undefined): 'anamnesis' | 'imaging' {
  const t = (v ?? '').trim().toLowerCase();
  if (t === 'anamnesis') return 'anamnesis';
  if (t === 'imaging') return 'imaging';
  throw new BadRequestException('kind должен быть anamnesis или imaging');
}

@ApiTags('ai-tools')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard, ModerationGuard)
export class AiToolsController {
  constructor(private readonly ai: AiToolsService) {}

  @Post('medical-analyzer')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
      fileFilter: (_req, file, cb) => {
        const ok =
          /^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype) ||
          file.mimetype === 'application/pdf' ||
          file.mimetype === 'application/dicom' ||
          file.mimetype === 'application/octet-stream';
        if (!ok) {
          cb(new BadRequestException('Формат не поддерживается. Загрузите JPG/PNG/WebP/GIF или PDF.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  async analyze(
    @CurrentUser() user: AuthUser,
    @Body() body: { kind?: string; anamnesisText?: string; notes?: string },
    @UploadedFiles() files?: MulterMemFile[],
  ) {
    const kind = normalizeKind(body.kind);
    const notes = (body.notes ?? '').trim();
    const anamnesisText = (body.anamnesisText ?? '').trim();
    const safeFiles = (files ?? []).filter(Boolean);

    await this.ai.assertMedicalAnalyzerEnabled();

    if (safeFiles.some((f) => (f.size ?? 0) > MAX_FILE_BYTES)) {
      throw new BadRequestException(`Файл слишком большой. Максимум ${MAX_FILE_MB}MB.`);
    }

    // Требуем подтверждённый email (как для комментариев), чтобы уменьшить злоупотребления.
    if (!user.emailVerified) {
      throw new ForbiddenException('Подтвердите email, чтобы пользоваться AI-инструментами.');
    }

    if (kind === 'anamnesis') {
      if (!anamnesisText && safeFiles.length === 0) {
        throw new BadRequestException('Для анамнеза укажите текст или загрузите файл.');
      }
      return this.ai.analyzeAnamnesis({
        userId: user.id,
        anamnesisText,
        files: safeFiles,
      });
    }

    if (safeFiles.length === 0) {
      throw new BadRequestException('Для УЗИ/Рентгена загрузите хотя бы один снимок.');
    }
    return this.ai.analyzeImaging({
      userId: user.id,
      notes,
      files: safeFiles,
    });
  }
}

