import { useLayoutEffect, useState } from "react";
import { Cake, Gift, Sparkles, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const STORAGE_PREFIX = "vetconnect_birthday_ack_v1";

function isBirthdayToday(birthISO: string | null | undefined): boolean {
  if (!birthISO) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthISO);
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3]);
  const now = new Date();
  return now.getMonth() + 1 === month && now.getDate() === day;
}

function todayLocalIso(): string {
  const n = new Date();
  const y = n.getFullYear();
  const mo = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function ackStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}_${userId}_${todayLocalIso()}`;
}

function readAcked(userId: string): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(ackStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

function writeAck(userId: string): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(ackStorageKey(userId), "1");
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Поздравление в день рождения: только у владельца профиля, один раз за этот календарный день
 * (первый заход на главную после входа; повторные заходы и следующие входы в тот же день — без баннера).
 * Можно закрыть вручную; факт показа всё равно фиксируется, чтобы не показывать снова до следующего года.
 */
export default function BirthdayBanner() {
  const { isAuthenticated, user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  /** После первого показа за день помечаем в storage — следующий визит на главную / следующий вход не покажут блок. */
  const [active, setActive] = useState(false);

  const eligible =
    Boolean(isAuthenticated && user?.id && user.birthDate && isBirthdayToday(user.birthDate));

  useLayoutEffect(() => {
    if (!eligible || !user) {
      setActive(false);
      return;
    }
    if (readAcked(user.id)) {
      setActive(false);
      return;
    }
    writeAck(user.id);
    setActive(true);
  }, [eligible, user?.id, user?.birthDate]);

  const handleClose = () => {
    if (user?.id) writeAck(user.id);
    setDismissed(true);
    setActive(false);
  };

  if (!eligible || dismissed || !active) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 px-4 py-4 sm:px-6 sm:py-5 shadow-[0_8px_30px_-12px_rgba(219,39,119,0.35)]"
      role="region"
      aria-label="Поздравление с днём рождения"
    >
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-rose-800/80 hover:bg-white/80 hover:text-rose-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        aria-label="Закрыть поздравление"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-pink-200/35 blur-2xl" aria-hidden />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 pr-10">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-sm ring-2 ring-pink-200/80">
          <Cake className="h-8 w-8 text-pink-600" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold text-lg sm:text-xl text-rose-900">
            С днём рождения, {user.name}!
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0" aria-hidden />
          </p>
          <p className="mt-1 text-sm text-rose-800/95 leading-snug flex items-start gap-2">
            <Gift className="h-4 w-4 shrink-0 mt-0.5 text-rose-700" aria-hidden />
            Желаем здоровья, успехов на работе и тёплого котокомфорта вашим пациентам — от сообщества VetConnect.
          </p>
        </div>
      </div>
    </div>
  );
}
