import {
  Loader2,
  MapPin,
  MessageCircle,
  ThumbsUp,
  CalendarDays,
  FileText,
  MessageSquare,
  Award,
  User as UserIcon,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import UserAvatar from "../components/UserAvatar";
import ReportAbuseTrigger from "../components/ReportAbuseModal";
import {
  apiOpenDirectConversation,
  apiProfileViewerRelation,
  apiPublicProfile,
  apiThankUser,
  type PublicProfileResponse,
  type ViewerRelationResponse,
} from "../../lib/api";

function formatJoined(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function UserPublicProfile() {
  const rawId = useParams().userId ?? "";
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [card, setCard] = useState<PublicProfileResponse | null>(null);
  const [rel, setRel] = useState<ViewerRelationResponse | null>(null);
  const [thankBusy, setThankBusy] = useState(false);
  const [dmBusy, setDmBusy] = useState(false);

  const reloadViewer = useCallback(async () => {
    if (!isAuthenticated || !rawId || !user) {
      setRel(null);
      return;
    }
    try {
      const r = await apiProfileViewerRelation(rawId);
      setRel(r);
    } catch {
      setRel(null);
    }
  }, [isAuthenticated, rawId, user]);

  useEffect(() => {
    if (!rawId) {
      setErr("Неверная ссылка");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setErr("");
    setLoading(true);
    apiPublicProfile(rawId)
      .then((c) => {
        if (!cancelled) setCard(c);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Профиль не найден");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    void reloadViewer();
    return () => {
      cancelled = true;
    };
  }, [rawId, reloadViewer]);

  const handleThank = async () => {
    if (!card || thankBusy || rel?.isSelf || !isAuthenticated || rel?.thanked) return;
    setThankBusy(true);
    try {
      const res = await apiThankUser(card.userId);
      setCard((prev) =>
        prev
          ? {
              ...prev,
              stats: { ...prev.stats, thanksReceivedCount: res.thanksReceivedCount },
            }
          : prev,
      );
      setRel((r) => (r ? { ...r, thanked: true } : r));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось отправить благодарность");
    } finally {
      setThankBusy(false);
    }
  };

  const handleMessage = async () => {
    if (!card || dmBusy || rel?.isSelf || !isAuthenticated) return;
    setDmBusy(true);
    try {
      let cid = rel?.conversationId ?? null;
      if (!cid) {
        const opened = await apiOpenDirectConversation(card.userId);
        cid = opened.conversationId;
        setRel((r) => (r ? { ...r, conversationId: cid } : r));
      }
      navigate(`/messages/${cid}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Не удалось открыть переписку");
    } finally {
      setDmBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-600 py-16 justify-center">
        <Loader2 className="w-7 h-7 animate-spin" />
        Загрузка профиля…
      </div>
    );
  }

  if (err || !card) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center max-w-lg mx-auto">
        <p className="text-rose-800 font-medium mb-4">{err || "Профиль недоступен"}</p>
        <Link to="/" className="text-emerald-700 font-semibold hover:underline">
          На главную
        </Link>
      </div>
    );
  }

  const p = card.profile;
  const stats = card.stats;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-28 bg-gradient-to-r from-teal-600 to-emerald-600" />
        <div className="px-6 sm:px-8 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
          <UserAvatar
            avatarUrl={p.avatarUrl}
            label={p.displayName}
            className="w-28 h-28 ring-4 ring-white shadow-xl"
            moderation={card.moderation}
          />
          <div className="flex-1 min-w-0 pt-2 sm:pb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">{p.displayName}</h1>
            <p className="text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1">
                <UserIcon className="w-4 h-4 text-slate-400" />
                {p.jobTitle.nameRu}
              </span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                {p.city}
                {p.country?.nameRu ? `, ${p.country.nameRu}` : ""}
              </span>
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />С нами с {formatJoined(card.joinedAt)}
              </span>
              {p.verification === "VERIFIED" && (
                <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-semibold">
                  Профиль верифицирован
                </span>
              )}
            </div>
          </div>

          {!rel?.isSelf && isAuthenticated ? (
            <div className="flex flex-wrap gap-2 sm:justify-end pb-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => void handleThank()}
                disabled={thankBusy || !!rel?.thanked}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-white px-4 py-2.5 text-sm font-semibold shadow hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ThumbsUp className="w-4 h-4" />
                {rel?.thanked ? "Спасибо отправлено" : thankBusy ? "…" : "Сказать спасибо"}
              </button>
              <button
                type="button"
                onClick={() => void handleMessage()}
                disabled={dmBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 text-white px-4 py-2.5 text-sm font-semibold shadow hover:bg-slate-900 disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4" />
                {dmBusy ? "…" : "Написать"}
              </button>
              <ReportAbuseTrigger
                modalLabel={`Учётная запись / профиль (${p.displayName})`}
                payload={{ targetType: "USER", reportedUserId: card.userId }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-red-50 hover:text-red-800 hover:border-red-200"
              />
            </div>
          ) : null}

          {rel?.isSelf ? (
            <div className="pb-2 w-full sm:w-auto">
              <Link
                to="/profile"
                className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 px-4 py-2.5 text-sm font-semibold hover:bg-emerald-100"
              >
                Редактировать мой профиль
              </Link>
            </div>
          ) : null}

          {!isAuthenticated && !rel?.isSelf ? (
            <div className="pb-2 text-sm text-slate-600">
              <Link to="/login" state={{ from: `/users/${card.userId}` }} className="font-semibold text-emerald-700 hover:underline">
                Войдите
              </Link>
              , чтобы поблагодарить или написать личным сообщением
            </div>
          ) : null}
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatChip icon={<MessageSquare className="w-5 h-5" />} label="Тем на форуме" value={stats.forumThreadsCreated} tone="sky" />
        <StatChip icon={<MessageCircle className="w-5 h-5" />} label="Ответов" value={stats.forumPostsCreated} tone="violet" />
        <StatChip icon={<Award className="w-5 h-5" />} label="Лучших ответов" value={stats.acceptedSolutionsCount} tone="amber" />
        <StatChip icon={<ThumbsUp className="w-5 h-5" />} label="Благодарностей" value={stats.thanksReceivedCount} tone="rose" />
        <StatChip icon={<FileText className="w-5 h-5" />} label="Статей" value={stats.articlesPublished} tone="slate" className="col-span-2 lg:col-span-1" />
      </section>

      <p className="text-xs text-slate-500 max-w-xl">
        Личные сообщения доступны только вам и собеседнику; содержание переписок не публикуется на форуме и не индексируется в
        ленте.
      </p>
    </div>
  );
}

function StatChip(props: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "sky" | "violet" | "amber" | "rose" | "slate";
  className?: string;
}) {
  const box: Record<string, string> = {
    sky: "border-sky-100 bg-sky-50/80 text-sky-950",
    violet: "border-violet-100 bg-violet-50/80 text-violet-950",
    amber: "border-amber-100 bg-amber-50/80 text-amber-950",
    rose: "border-rose-100 bg-rose-50/80 text-rose-950",
    slate: "border-slate-200 bg-slate-50 text-slate-900",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${box[props.tone]} ${props.className ?? ""}`}>
      <div className="text-slate-500 mb-1">{props.icon}</div>
      <div className="text-2xl font-bold tabular-nums">{props.value}</div>
      <div className="text-[11px] sm:text-xs font-medium opacity-85 leading-snug">{props.label}</div>
    </div>
  );
}
