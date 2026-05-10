import { useCallback, useState } from "react";
import { FileText, X } from "lucide-react";
import { assetUrl } from "../../lib/api";
import { FORUM_EMBEDDED_FILE_LINE } from "./ForumRenderedBody";

function isImagePath(path: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(path.trim());
}

function fileName(path: string): string {
  const s = path.trim().split("/").pop() ?? path;
  return s.length > 40 ? `${s.slice(0, 36)}…` : s;
}

type Props = {
  urls: string[];
};

/**
 * Миниатюры вложений комментария; по клику — разворот в оверлее на той же странице (без ухода в новую вкладку).
 */
export default function CommentAttachmentsGallery({ urls }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const close = useCallback(() => setOpen(null), []);

  if (!urls?.length) return null;

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {urls.map((path) => {
          const abs = assetUrl(path);
          const img = isImagePath(path);
          return (
            <button
              key={path}
              type="button"
              onClick={() => setOpen(path)}
              className="relative rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm hover:ring-2 hover:ring-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0"
              title={fileName(path)}
            >
              {img ? (
                <img src={abs} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="flex flex-col items-center gap-0.5 px-1 text-[10px] text-emerald-900 font-medium text-center leading-tight">
                  <FileText className="w-7 h-7 text-emerald-600 shrink-0" aria-hidden />
                  <span className="line-clamp-2 break-all">{fileName(path)}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-black/75"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр вложения"
          onClick={close}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 bg-slate-50">
              <span className="text-xs sm:text-sm font-medium text-slate-800 truncate pr-2">{fileName(open)}</span>
              <button
                type="button"
                onClick={close}
                className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto bg-slate-900/5 flex items-center justify-center p-2">
              {isImagePath(open) ? (
                <img
                  src={assetUrl(open)}
                  alt=""
                  className="max-w-full max-h-[calc(90vh-5rem)] object-contain rounded-lg"
                />
              ) : FORUM_EMBEDDED_FILE_LINE.test(open.trim()) ? (
                <iframe
                  title={fileName(open)}
                  src={assetUrl(open)}
                  className="w-full min-h-[70vh] sm:min-h-[75vh] rounded-lg border border-gray-200 bg-white"
                />
              ) : (
                <p className="text-sm text-gray-600 p-4">Предпросмотр недоступен.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
