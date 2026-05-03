/** Вставки в textarea для Markdown в личных сообщениях */

export function insertAtCursor(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  setValue: (next: string) => void,
  insert: string,
  cursorOffset?: number,
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const next = currentValue.slice(0, start) + insert + currentValue.slice(end);
  setValue(next);
  const pos = start + insert.length + (cursorOffset ?? 0);
  queueMicrotask(() => {
    textarea.focus();
    textarea.setSelectionRange(Math.max(0, pos), Math.max(0, pos));
  });
}

export function wrapSelection(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  setValue: (next: string) => void,
  open: string,
  close: string,
): void {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = currentValue.slice(start, end);
  const next = currentValue.slice(0, start) + open + selected + close + currentValue.slice(end);
  setValue(next);
  const selStart = start + open.length;
  const selEnd = selStart + selected.length;
  queueMicrotask(() => {
    textarea.focus();
    textarea.setSelectionRange(selStart, selEnd);
  });
}

export function prefixCurrentLine(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  setValue: (next: string) => void,
  prefix: string,
): void {
  const pos = textarea.selectionStart;
  const lineStart = currentValue.lastIndexOf("\n", pos - 1) + 1;
  const next = currentValue.slice(0, lineStart) + prefix + currentValue.slice(lineStart);
  setValue(next);
  const delta = prefix.length;
  queueMicrotask(() => {
    textarea.focus();
    textarea.setSelectionRange(pos + delta, pos + delta);
  });
}

export function isAllowedHttpUrl(raw: string): boolean {
  const t = raw.trim();
  return /^https?:\/\//i.test(t);
}
