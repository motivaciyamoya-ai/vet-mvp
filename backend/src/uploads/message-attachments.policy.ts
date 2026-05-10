/** Файлы в теле поста/комментария: одна строка = один URL из хранилища вложений к сообщениям. */
export const MESSAGE_ATTACHMENT_LINE =
  /^\/uploads\/messages\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp|gif|pdf|txt|docx)$/i;

/** Строка целиком — URL встроенного в пост изображения темы (как раньше). */
export const THREAD_IMAGE_ATTACHMENT_LINE =
  /^\/uploads\/thread\/[a-zA-Z0-9._-]+\.(jpe?g|png|webp|gif)$/i;

export function isMessageAttachmentLine(line: string): boolean {
  const t = line.trim();
  return t.length > 0 && t.length <= 500 && MESSAGE_ATTACHMENT_LINE.test(t);
}

export function isThreadImageAttachmentLine(line: string): boolean {
  const t = line.trim();
  return t.length > 0 && t.length <= 500 && THREAD_IMAGE_ATTACHMENT_LINE.test(t);
}

/** Разрешённые строки вложений для форума: изображения темы + файлы из /uploads/messages/. */
export function sanitizeForumAttachmentUrlList(raw: string[] | undefined, maxLines: number): string[] {
  if (!Array.isArray(raw)) return [];
  const cap = Math.max(1, Math.min(30, maxLines));
  return raw
    .filter((u): u is string => typeof u === 'string')
    .map((u) => u.trim())
    .filter((u) => isThreadImageAttachmentLine(u) || isMessageAttachmentLine(u))
    .slice(0, cap);
}

/** Только файлы из хранилища сообщений (для комментариев к статьям). */
export function sanitizeArticleCommentAttachmentUrls(raw: string[] | undefined, maxFiles: number): string[] {
  if (!Array.isArray(raw)) return [];
  const cap = Math.max(1, Math.min(10, maxFiles));
  return raw
    .filter((u): u is string => typeof u === 'string')
    .map((u) => u.trim())
    .filter((u) => isMessageAttachmentLine(u))
    .slice(0, cap);
}

/** Вложения к заявке на статью (до 15 файлов). */
export function sanitizeArticleSubmissionAttachmentUrls(raw: string[] | undefined, maxFiles: number): string[] {
  if (!Array.isArray(raw)) return [];
  const cap = Math.max(1, Math.min(15, maxFiles));
  return raw
    .filter((u): u is string => typeof u === 'string')
    .map((u) => u.trim())
    .filter((u) => isMessageAttachmentLine(u))
    .slice(0, cap);
}
