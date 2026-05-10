import { Loader2 } from "lucide-react";

/** Fallback для React.Suspense при ленивой подгрузке страниц. */
export default function PageLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-600"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-hidden />
      <p className="text-sm font-medium">Загрузка раздела…</p>
    </div>
  );
}
