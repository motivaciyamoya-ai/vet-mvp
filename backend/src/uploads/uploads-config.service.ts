import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const KEY_ENABLED = 'uploads.messages.enabled';
const KEY_MAX_MB = 'uploads.messages.max_mb';
const KEY_MAX_FILES = 'uploads.messages.max_per_message';
const KEY_FORUM_MAX_LINES = 'uploads.forum.max_attachment_lines';

function parseBoolSetting(raw: string | undefined, defaultTrue: boolean): boolean {
  if (raw == null || raw === '') return defaultTrue;
  const v = raw.trim().toLowerCase();
  if (['0', 'false', 'off', 'no', 'disabled'].includes(v)) return false;
  if (['1', 'true', 'on', 'yes', 'enabled'].includes(v)) return true;
  return defaultTrue;
}

function parseIntClamped(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw == null || raw.trim() === '') return fallback;
  const n = parseInt(raw.trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

@Injectable()
export class UploadsConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async messageAttachmentsEnabled(): Promise<boolean> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: KEY_ENABLED } });
    return parseBoolSetting(row?.value, true);
  }

  /** Лимит размера одного файла (байты). */
  async messageMaxBytes(): Promise<number> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: KEY_MAX_MB } });
    const mb = parseIntClamped(row?.value, 12, 1, 50);
    return mb * 1024 * 1024;
  }

  /** Сколько файлов из /uploads/messages/ можно прикрепить к одному комментарию к статье. */
  async messageMaxFilesPerComment(): Promise<number> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: KEY_MAX_FILES } });
    return parseIntClamped(row?.value, 5, 1, 10);
  }

  /** Максимум строк-вложений (картинки темы + файлы) в одном посте форума. */
  async forumMaxAttachmentLines(): Promise<number> {
    const row = await this.prisma.siteSetting.findUnique({ where: { key: KEY_FORUM_MAX_LINES } });
    return parseIntClamped(row?.value, 10, 4, 25);
  }

  async publicAttachmentPolicy(): Promise<{
    messagesEnabled: boolean;
    maxMb: number;
    maxFilesPerComment: number;
    forumMaxAttachmentLines: number;
    allowedMimeTypes: string[];
  }> {
    const [messagesEnabled, maxBytes, maxFiles, forumLines] = await Promise.all([
      this.messageAttachmentsEnabled(),
      this.messageMaxBytes(),
      this.messageMaxFilesPerComment(),
      this.forumMaxAttachmentLines(),
    ]);
    return {
      messagesEnabled,
      maxMb: Math.round(maxBytes / (1024 * 1024)),
      maxFilesPerComment: maxFiles,
      forumMaxAttachmentLines: forumLines,
      allowedMimeTypes: [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
    };
  }
}
