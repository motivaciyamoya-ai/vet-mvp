import { Flag, Loader2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { apiCreateReport, type CreateReportBody } from "../../lib/api";
import { useAuth } from "../contexts/AuthContext";

type Payload = Omit<CreateReportBody, "reason">;

type ModalProps = {
  open: boolean;
  onClose: () => void;
  subjectLabel: string;
  payload: Payload;
  onSent?: () => void;
};

/** Модалка: описание жалобы и отправка в модерацию (POST /api/reports). */
export function ReportAbuseModal({ open, onClose, subjectLabel, payload, onSent }: ModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setErr("");
    }
  }, [open, payload]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const t = reason.trim();
    if (t.length < 3) {
      setErr("Опишите ситуацию не короче 3 символов.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await apiCreateReport({ ...payload, reason: t });
      onSent?.();
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-[1px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-abuse-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <Flag className="w-5 h-5 text-red-600 shrink-0" aria-hidden />
            <h2 id="report-abuse-title" className="font-semibold text-slate-900 truncate text-sm sm:text-base">
              Жалоба модератору
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-3 space-y-3 text-sm">
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            <span className="font-medium text-slate-800">Объект: </span>
            {subjectLabel}
          </p>
          <p className="text-xs text-slate-500">
            Жалоба попадёт в раздел «Админка → Жалобы». Укажите, что нарушено (оскорбления, спам, личные данные и
            т.д.).
          </p>
          <label className="block">
            <span className="text-xs font-medium text-slate-700">Комментарий</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 2000))}
              rows={5}
              placeholder="Кратко опишите проблему…"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/25"
            />
          </label>
          <p className="text-[10px] text-slate-400 tabular-nums">{reason.trim().length}/2000</p>
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
        </div>
        <div className="flex gap-2 justify-end px-4 py-3 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 hover:bg-white"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy || reason.trim().length < 3}
            onClick={() => void submit()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-45"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}

type TriggerProps = {
  /** Подпись кнопки */
  children?: ReactNode;
  modalLabel: string;
  payload: Payload;
  className?: string;
  onSent?: () => void;
};

/** Кнопка «Пожаловаться»; не рендерится для гостей. */
export default function ReportAbuseTrigger({
  children,
  modalLabel,
  payload,
  className,
  onSent,
}: TriggerProps) {
  const { isAuthenticated, authReady } = useAuth();
  const [open, setOpen] = useState(false);

  if (!authReady || !isAuthenticated) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-700 hover:underline decoration-red-300"
        }
      >
        {children ?? (
          <>
            <Flag className="w-3.5 h-3.5 shrink-0 opacity-80" aria-hidden />
            Пожаловаться
          </>
        )}
      </button>
      <ReportAbuseModal
        open={open}
        onClose={() => setOpen(false)}
        subjectLabel={modalLabel}
        payload={payload}
        onSent={onSent}
      />
    </>
  );
}
