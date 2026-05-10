import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import CookiePolicyRuContent, {
  COOKIE_POLICY_EFFECTIVE_DATE,
  COOKIE_POLICY_VERSION,
} from "../components/legal/CookiePolicyRuContent";
import LegalHtmlBody from "../components/legal/LegalHtmlBody";
import { apiReferenceLegal } from "../../lib/api";

export default function CookiePolicy() {
  const [html, setHtml] = useState<string | null | undefined>(undefined);
  const [loadErr, setLoadErr] = useState("");

  useEffect(() => {
    let c = false;
    setLoadErr("");
    apiReferenceLegal()
      .then((r) => {
        if (!c) setHtml(r.cookiesHtml);
      })
      .catch((e: unknown) => {
        if (!c) {
          setHtml(null);
          setLoadErr(e instanceof Error ? e.message : "Не удалось загрузить настройки");
        }
      });
    return () => {
      c = true;
    };
  }, []);

  const custom = html != null && html.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        {custom ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            Текст задан администратором сайта (не встроенный шаблон).
          </p>
        ) : (
          <p className="text-xs text-slate-500 sm:text-sm">
            Версия {COOKIE_POLICY_VERSION} от {COOKIE_POLICY_EFFECTIVE_DATE}
          </p>
        )}
        <Link to="/" className="text-sm font-semibold text-emerald-700 hover:underline shrink-0">
          На главную
        </Link>
      </div>

      {loadErr ? <p className="text-sm text-red-600">{loadErr}</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        {html === undefined ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" />
            Загрузка…
          </div>
        ) : custom ? (
          <LegalHtmlBody html={html!} />
        ) : (
          <CookiePolicyRuContent />
        )}
      </div>
    </div>
  );
}
