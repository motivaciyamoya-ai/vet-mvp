import { AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { moderationAccountBannerLines } from "../../lib/moderationUi";

export default function ModerationAccountBanner() {
  const { authReady, user } = useAuth();
  if (!authReady || !user?.moderation || user.moderation.status === "NONE") return null;

  const { title, body } = moderationAccountBannerLines(user.moderation);
  if (!title) return null;

  const tone =
    user.moderation.status === "BANNED"
      ? "border-rose-300 bg-rose-50 text-rose-950"
      : user.moderation.status === "TEMP_SUSPENDED"
        ? "border-amber-300 bg-amber-50 text-amber-950"
        : "border-sky-300 bg-sky-50 text-sky-950";

  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 shadow-sm ${tone}`}>
      <div className="flex gap-3 items-start">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="font-bold text-sm">{title}</p>
          {body ? <p className="text-sm mt-1 leading-snug opacity-95">{body}</p> : null}
        </div>
      </div>
    </div>
  );
}
