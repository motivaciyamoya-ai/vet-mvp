import { randomUUID } from 'crypto';
import { basename, dirname, join } from 'path';
import { unlink } from 'fs/promises';
import sharp from 'sharp';

/**
 * Сжимает загруженное изображение в WebP (до 2560 px по длинной стороне).
 * Анимированные GIF оставляет как есть. При ошибке транскодинга возвращает исходное имя файла.
 */
export async function finalizeUploadAsWebp(absoluteInputPath: string): Promise<string> {
  const originalName = basename(absoluteInputPath);
  const dir = dirname(absoluteInputPath);

  let meta: sharp.Metadata;
  try {
    meta = await sharp(absoluteInputPath, { failOn: 'none' }).metadata();
  } catch {
    return originalName;
  }

  const pages = meta.pages ?? 1;
  if (meta.format === 'gif' && pages > 1) {
    return originalName;
  }

  const outName = `${randomUUID()}.webp`;
  const outPath = join(dir, outName);

  try {
    let pipeline = sharp(absoluteInputPath, { failOn: 'none' }).rotate();

    if (meta.format !== 'gif') {
      pipeline = pipeline.resize({
        width: 2560,
        height: 2560,
        fit: 'inside',
        withoutEnlargement: true,
      });
    } else {
      pipeline = pipeline.resize(2560, 2560, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    await pipeline.webp({ quality: 82, effort: 4, smartSubsample: true }).toFile(outPath);
    await unlink(absoluteInputPath);
    return outName;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[uploads] WebP transcoding failed, keeping original file', err);
    try {
      await unlink(outPath);
    } catch {
      /* ignore */
    }
    return originalName;
  }
}
