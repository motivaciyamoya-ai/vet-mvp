import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Проверяем ссылку…");
  const { refreshProfile } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token?.trim()) {
      setMsg("В ссылке нет токена. Запросите письмо повторно в профиле.");
      return;
    }
    apiFetch<{ ok: boolean }>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async () => {
        setMsg("Email подтверждён. Перенаправляем…");
        try {
          await refreshProfile();
        } catch {
          /* если нет токена в этой вкладке — игнорируем */
        }
        const hasAccess = !!localStorage.getItem("vetmvp_access");
        const next = hasAccess ? "/profile" : "/login";
        setTimeout(() => navigate(next), 900);
      })
      .catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Не удалось подтвердить"));
  }, [params, navigate, refreshProfile]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 mb-3">Подтверждение email</h1>
        <p className="text-slate-600 text-sm">{msg}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Link to="/login" className="text-emerald-700 font-semibold underline">
            Вход
          </Link>
          <Link to="/" className="text-slate-600 underline">
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
