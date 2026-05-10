import {
  BadRequestException,
  Controller,
  ForbiddenException,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { basename, join } from 'path';
import { mkdirSync } from 'fs';
import { stat } from 'fs/promises';
import { unlink } from 'fs/promises';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { finalizeUploadAsWebp } from './image-transcode.util';
import { UploadsConfigService } from './uploads-config.service';

const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function safeExt(orig: string): string {
  const lower = orig.toLowerCase().replace(/\\/g, '/').split('/').pop() ?? '';
  const dot = lower.lastIndexOf('.');
  const ext = dot >= 0 ? lower.slice(dot) : '';
  return allowedExt.has(ext) ? ext : '.jpg';
}

const threadDest = join(process.cwd(), 'uploads', 'thread');
const avatarDest = join(process.cwd(), 'uploads', 'avatars');
const listingDest = join(process.cwd(), 'uploads', 'listings');
const messageDest = join(process.cwd(), 'uploads', 'messages');

/** Поля `multer` diskStorage, нужные после загрузки. */
interface UploadedDiskFile {
  filename?: string;
  path?: string;
  mimetype?: string;
}

function normalizeMime(m: string): string {
  return m.toLowerCase().split(';')[0].trim();
}

function extFromMime(mime: string): string {
  const m = normalizeMime(mime);
  switch (m) {
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/pjpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    case 'application/pdf':
      return '.pdf';
    case 'text/plain':
      return '.txt';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return '.docx';
    default:
      return '';
  }
}

const imageFileInterceptor = (dest: string) =>
  FileInterceptor('file', {
    limits: { fileSize: 8 * 1024 * 1024 },
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        try {
          mkdirSync(dest, { recursive: true });
        } catch {
          /* ignore */
        }
        cb(null, dest);
      },
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${safeExt(file.originalname)}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!/^image\/(jpeg|pjpeg|png|webp|gif)$/i.test(file.mimetype)) {
        cb(new BadRequestException('Допускаются только изображения: JPEG, PNG, WebP, GIF'), false);
        return;
      }
      cb(null, true);
    },
  });

const messageFileInterceptor = FileInterceptor('file', {
  limits: { fileSize: 52 * 1024 * 1024 },
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      try {
        mkdirSync(messageDest, { recursive: true });
      } catch {
        /* ignore */
      }
      cb(null, messageDest);
    },
    filename: (_req, file, cb) => {
      const ext = extFromMime(file.mimetype);
      if (!ext) {
        cb(new BadRequestException('Недопустимый тип файла'), '');
        return;
      }
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (!extFromMime(file.mimetype)) {
      cb(
        new BadRequestException('Допускаются JPEG, PNG, WebP, GIF, PDF, TXT, DOCX'),
        false,
      );
      return;
    }
    cb(null, true);
  },
});

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard, ModerationGuard)
export class UploadsController {
  constructor(private readonly uploadsConfig: UploadsConfigService) {}

  /** Иллюстрации к теме форума; URL вернётся как `/uploads/thread/…` для поля coverImageUrls. */
  @Post('thread-image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageFileInterceptor(threadDest))
  async uploadThreadImage(@UploadedFile() file?: UploadedDiskFile) {
    if (!file?.filename) {
      throw new BadRequestException('Прикрепите файл изображения (поле form-data: file)');
    }
    const abs = file.path ?? join(threadDest, file.filename);
    const name = await finalizeUploadAsWebp(abs);
    return { url: `/uploads/thread/${name}` };
  }

  /**
   * Вложения к сообщениям форума и комментариям к статьям.
   * URL: `/uploads/messages/<uuid>.<ext>` — настраивается в админке (`uploads.messages.*`).
   */
  @Post('message-attachment')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(messageFileInterceptor)
  async uploadMessageAttachment(@UploadedFile() file?: UploadedDiskFile) {
    if (!(await this.uploadsConfig.messageAttachmentsEnabled())) {
      if (file?.path) await unlink(file.path).catch(() => {});
      throw new ForbiddenException('Загрузка вложений отключена в настройках сайта.');
    }
    if (!file?.filename) {
      throw new BadRequestException('Прикрепите файл (поле form-data: file)');
    }
    const abs = file.path ?? join(messageDest, file.filename);
    const maxBytes = await this.uploadsConfig.messageMaxBytes();
    const size = (await stat(abs)).size;
    if (size > maxBytes) {
      await unlink(abs).catch(() => {});
      throw new PayloadTooLargeException(
        `Файл больше допустимого лимита (${Math.round(maxBytes / (1024 * 1024))} МБ). Измените лимит в админке или уменьшите файл.`,
      );
    }

    const mime = normalizeMime(file.mimetype ?? '');
    if (mime.startsWith('image/')) {
      const name = await finalizeUploadAsWebp(abs);
      return { url: `/uploads/messages/${name}` };
    }

    return { url: `/uploads/messages/${basename(abs)}` };
  }

  /** Аватар профиля; после ответа вызовите PATCH /users/me с { avatarUrl: url }. */
  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageFileInterceptor(avatarDest))
  async uploadAvatar(@UploadedFile() file?: UploadedDiskFile) {
    if (!file?.filename) {
      throw new BadRequestException('Прикрепите файл изображения (поле form-data: file)');
    }
    const abs = file.path ?? join(avatarDest, file.filename);
    const name = await finalizeUploadAsWebp(abs);
    return { url: `/uploads/avatars/${name}` };
  }

  /** Изображение объявления (маркетплейс); URL вернётся как `/uploads/listings/…`. */
  @Post('listing-image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(imageFileInterceptor(listingDest))
  async uploadListingImage(@UploadedFile() file?: UploadedDiskFile) {
    if (!file?.filename) {
      throw new BadRequestException('Прикрепите файл изображения (поле form-data: file)');
    }
    const abs = file.path ?? join(listingDest, file.filename);
    const name = await finalizeUploadAsWebp(abs);
    return { url: `/uploads/listings/${name}` };
  }
}
