import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type PromptTone = "neutral" | "hero";

type PublishLoginPromptProps = {
  /** Подсказка вместо текста по умолчанию */
  hint?: string;
  className?: string;
  tone?: PromptTone;
};

export function PublishLoginPrompt({ hint, className = "", tone = "neutral" }: PublishLoginPromptProps) {
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;

  const box =
    tone === "hero"
      ? "rounded-xl border border-white/35 bg-black/15 px-4 py-3 backdrop-blur-[2px]"
      : "rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3";

  const text = tone === "hero" ? "text-emerald-50/95 leading-relaxed" : "text-slate-700 leading-relaxed";

  const primaryBtn =
    tone === "hero"
      ? "inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm hover:bg-emerald-50"
      : "inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700";

  const secondaryBtn =
    tone === "hero"
      ? "inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/50 bg-transparent px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      : "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50";

  return (
    <div className={`${box} text-sm ${className}`}>
      <p className={text}>
        {hint ??
          "Чтобы разместить объявление, тему форума, статью или другой материал, войдите в аккаунт или пройдите регистрацию."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/login" state={{ from }} className={primaryBtn}>
          <LogIn className="h-4 w-4 shrink-0" aria-hidden />
          Войти
        </Link>
        <Link to="/register" state={{ from }} className={secondaryBtn}>
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
          Регистрация
        </Link>
      </div>
    </div>
  );
}

type GuestPublishGateProps = {
  children: ReactNode;
  /** Стиль блока напоминания для гостя */
  promptClassName?: string;
  tone?: PromptTone;
  hint?: string;
};

/** Для авторизованных — дочерние элементы (кнопки публикации); для гостей — напоминание со входом и регистрацией. */
export default function GuestPublishGate({
  children,
  promptClassName,
  tone = "neutral",
  hint,
}: GuestPublishGateProps) {
  const { authReady, isAuthenticated } = useAuth();
  if (!authReady) return null;
  if (isAuthenticated) return <>{children}</>;
  return <PublishLoginPrompt hint={hint} tone={tone} className={promptClassName ?? ""} />;
}
