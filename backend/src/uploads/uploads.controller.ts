import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { finalizeUploadAsWebp } from './image-transcode.util';

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

/** Поля `multer` diskStorage, нужные после загрузки. */
interface UploadedDiskFile {
  filename?: string;
  path?: string;
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

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard, ModerationGuard)
export class UploadsController {
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
