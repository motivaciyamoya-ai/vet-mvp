import { Link } from "react-router";
import CookiePolicyRuContent, {
  COOKIE_POLICY_EFFECTIVE_DATE,
  COOKIE_POLICY_VERSION,
} from "../components/legal/CookiePolicyRuContent";

export default function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500 sm:text-sm">
          Версия {COOKIE_POLICY_VERSION} от {COOKIE_POLICY_EFFECTIVE_DATE}
        </p>
        <Link to="/" className="text-sm font-semibold text-emerald-700 hover:underline shrink-0">
          На главную
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <CookiePolicyRuContent />
      </div>
    </div>
  );
}
