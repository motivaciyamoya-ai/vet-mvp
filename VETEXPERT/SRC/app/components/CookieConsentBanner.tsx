import { useEffect, useState } from "react";
import { Link } from "react-router";

const KEY = "vetexpert_cookie_consent_v1";
type Consent = "accepted" | "rejected";

export default function CookieConsentBanner() {
  const [consent, setConsent] = useState<Consent | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === "accepted" || raw === "rejected") setConsent(raw);
      else setConsent(null);
    } catch {
      setConsent(null);
    }
  }, []);

  const save = (v: Consent) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
    setConsent(v);
  };

  if (consent !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[250] p-3 sm:p-4">
      <div className="max-w-5xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Мы используем cookies</p>
            <p className="text-sm text-slate-600 mt-1">
              Они нужны для работы входа, сохранения настроек и безопасности. Подробнее — в{" "}
              <Link to="/cookies" className="text-emerald-700 font-semibold hover:underline">
                политике cookies
              </Link>{" "}
              и{" "}
              <Link to="/privacy" className="text-emerald-700 font-semibold hover:underline">
                политике конфиденциальности
              </Link>
              .
            </p>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => save("rejected")}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-800 text-sm font-semibold hover:bg-slate-50"
            >
              Отклонить
            </button>
            <button
              type="button"
              onClick={() => save("accepted")}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
            >
              Принять
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

