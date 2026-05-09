import {
  User,
  Mail,
  MapPin,
  Shield,
  Settings,
  Bell,
  Gift,
  Send,
  Coins,
  Sparkles,
  Stethoscope as StethoscopeIcon,
  Camera,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { apiFetch, apiUploadAvatar, assetUrl } from "../../lib/api";
import AvatarCropModal from "./AvatarCropModal";
import VetPointsBalance from "./VetPointsBalance";
import VetPointsStats from "./VetPointsStats";
import BadgeStore from "./BadgeStore";
import TransferPoints from "./TransferPoints";
import RoleAssistant from "./RoleAssistant";
import MedicalAnalyzerHistory from "./MedicalAnalyzerHistory";
import { useVetPoints } from "../contexts/VetPointsContext";
import { useAuth } from "../contexts/AuthContext";

function initialsFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDaysWord(n: number) {
  const v = Math.abs(n) % 100;
  const d = v % 10;
  if (v >= 11 && v <= 19) return "дней";
  if (d === 1) return "день";
  if (d >= 2 && d <= 4) return "дня";
  return "дней";
}

type CountryRef = { id: string; code: string; nameRu: string };
type JobTitleRef = { id: string; nameRu: string };

export default function Profile() {
  const { user, isAuthenticated, authReady, refreshProfile } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarEditUrl, setAvatarEditUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "assistant" | "points">("overview");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [badgeStoreOpen, setBadgeStoreOpen] = useState(false);
  const [transferPointsOpen, setTransferPointsOpen] = useState(false);
  const { badges } = useVetPoints();

  const [refsLoading, setRefsLoading] = useState(true);
  const [refsErr, setRefsErr] = useState("");
  const [countriesList, setCountriesList] = useState<CountryRef[]>([]);
  const [jobTitlesList, setJobTitlesList] = useState<JobTitleRef[]>([]);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editCountryId, setEditCountryId] = useState("");
  const [editJobTitleId, setEditJobTitleId] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveOk, setProfileSaveOk] = useState(false);
  const [profileFormErr, setProfileFormErr] = useState("");

  useEffect(() => {
    return () => {
      if (avatarEditUrl) URL.revokeObjectURL(avatarEditUrl);
    };
  }, [avatarEditUrl]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    let cancelled = false;
    async function loadRefs() {
      setRefsLoading(true);
      setRefsErr("");
      try {
        const [countries, jobTitles] = await Promise.all([
          apiFetch<CountryRef[]>("/api/reference/countries"),
          apiFetch<JobTitleRef[]>("/api/reference/job-titles"),
        ]);
        if (!cancelled) {
          setCountriesList(countries);
          setJobTitlesList(jobTitles);
        }
      } catch (e: unknown) {
        if (!cancelled) setRefsErr(e instanceof Error ? e.message : "Не удалось загрузить справочники");
      } finally {
        if (!cancelled) setRefsLoading(false);
      }
    }
    void loadRefs();
    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated]);

  useEffect(() => {
    if (!user) return;
    setEditDisplayName(user.name);
    setEditCity(user.city ?? "");
    setEditCountryId(user.countryId ?? "");
    setEditJobTitleId(user.jobTitleId ?? "");
    setProfileSaveOk(false);
    setProfileFormErr("");
  }, [user?.id, user?.name, user?.city, user?.countryId, user?.jobTitleId]);

  const cancelAvatarCrop = () => {
    if (avatarEditUrl) URL.revokeObjectURL(avatarEditUrl);
    setAvatarEditUrl(null);
  };

  const onAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      alert("Выберите изображение: JPEG, PNG, WebP или GIF.");
      return;
    }
    if (avatarEditUrl) URL.revokeObjectURL(avatarEditUrl);
    setAvatarEditUrl(URL.createObjectURL(file));
  };

  const applyCroppedAvatar = async (blob: Blob) => {
    if (avatarEditUrl) URL.revokeObjectURL(avatarEditUrl);
    setAvatarEditUrl(null);
    setAvatarBusy(true);
    try {
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const { url } = await apiUploadAvatar(file);
      await apiFetch("/api/users/me", { method: "PATCH", json: { avatarUrl: url } });
      await refreshProfile();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Не удалось обновить аватар");
    } finally {
      setAvatarBusy(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFormErr("");
    setProfileSaveOk(false);
    const dn = editDisplayName.trim();
    if (dn.length < 2) {
      setProfileFormErr("Отображаемое имя — не менее 2 символов.");
      return;
    }
    if (!editCountryId || !editJobTitleId) {
      setProfileFormErr("Выберите страну и должность из списков.");
      return;
    }
    setProfileSaving(true);
    try {
      await apiFetch("/api/users/me", {
        method: "PATCH",
        json: {
          displayName: dn,
          city: editCity.trim(),
          countryId: editCountryId,
          jobTitleId: editJobTitleId,
        },
      });
      await refreshProfile();
      setProfileSaveOk(true);
    } catch (err: unknown) {
      setProfileFormErr(err instanceof Error ? err.message : "Не удалось сохранить профиль");
    } finally {
      setProfileSaving(false);
    }
  };

  const sendVerifyAgain = async () => {
    setVerifyBusy(true);
    setVerifyMsg("");
    try {
      await apiFetch("/api/auth/resend-verification", { method: "POST" });
      setVerifyMsg(
        "Если письмо не пришло подождите пару минут, проверьте папку «Спам» и корректность email в профиле.",
      );
    } catch (e: unknown) {
      setVerifyMsg(e instanceof Error ? e.message : "Не удалось отправить");
    } finally {
      setVerifyBusy(false);
    }
  };

  const showVerifyBanner = isAuthenticated && user != null && user.emailVerified === false;
  const joinedAtDate = user?.joinedAt ? new Date(user.joinedAt) : null;
  const daysOnPlatform =
    joinedAtDate && !Number.isNaN(joinedAtDate.getTime())
      ? Math.max(1, Math.floor((Date.now() - joinedAtDate.getTime()) / 86_400_000) + 1)
      : null;
  const st = user?.stats;

  if (!authReady) {
    return (
      <div className="space-y-5">
        <h1 className="font-bold text-xl sm:text-2xl">Личный кабинет</h1>
        <p className="text-gray-600 text-sm">Проверяем сессию с сервером…</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          <User className="w-8 h-8" />
        </div>
        <h1 className="font-bold text-2xl text-gray-900">Войдите в аккаунт</h1>
        <p className="text-gray-600 text-sm leading-relaxed">
          Профиль, VetCoin и действия на платформе доступны после входа. Мы больше не показываем демо-имена и выдуманную
          статистику гостям.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/login"
            className="inline-flex justify-center px-5 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
          >
            Войти
          </Link>
          <Link
            to="/register"
            className="inline-flex justify-center px-5 py-3 rounded-lg border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50"
          >
            Регистрация
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {avatarEditUrl ? (
        <AvatarCropModal imageSrc={avatarEditUrl} onCancel={cancelAvatarCrop} onApply={(b) => void applyCroppedAvatar(b)} />
      ) : null}
      <div>
        <h1 className="font-bold text-xl sm:text-2xl lg:text-3xl mb-1">Личный кабинет</h1>
        <p className="text-gray-600 text-sm lg:text-base">Ваши данные из базы (после входа)</p>

        {isAuthenticated && user?.id ? (
          <Link
            to={`/users/${user.id}`}
            className="inline-block mt-2 text-sm text-emerald-700 font-semibold hover:underline"
          >
            Как вас видят другие →
          </Link>
        ) : null}

        {showVerifyBanner && (
          <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-amber-950">Подтвердите email</p>
                <p className="text-sm text-amber-900 mt-0.5">
                  Перейдите по ссылке из письма (проверьте «Спам»). Если на сервере не настроен SMTP, ссылка после
                  регистрации дублируется только в логе backend — запросите «Отправить ссылку снова» и посмотрите лог.
                </p>
                {verifyMsg && <p className="text-xs text-amber-800 mt-2">{verifyMsg}</p>}
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-2 shrink-0">
              <button
                type="button"
                disabled={verifyBusy}
                onClick={() => void sendVerifyAgain()}
                className="inline-flex justify-center px-4 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 disabled:opacity-60"
              >
                {verifyBusy ? "Отправляем…" : "Отправить ссылку снова"}
              </button>
              <button type="button" className="text-xs text-amber-800 underline" onClick={() => void refreshProfile()}>
                Обновить статус профиля
              </button>
            </div>
          </div>
        )}

        {user.role === "ADMIN" && (
          <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-emerald-900">Администратор</p>
                <p className="text-sm text-emerald-800">Управление пользователями, контентом и справочниками.</p>
              </div>
            </div>
            <Link
              to="/admin"
              className="inline-flex justify-center items-center px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 shrink-0"
            >
              Открыть админ-панель
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                {user.avatar ? (
                  <img
                    src={assetUrl(user.avatar)}
                    alt=""
                    className="w-24 h-24 lg:w-28 lg:h-28 rounded-full object-cover border-2 border-emerald-100"
                  />
                ) : (
                  <div className="w-24 h-24 lg:w-28 lg:h-28 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-2xl lg:text-3xl">
                    {initialsFromName(user.name)}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 border-2 border-white rounded-full" />
              </div>

              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(ev) => void onAvatarPick(ev)} />
              <button
                type="button"
                disabled={avatarBusy || !!avatarEditUrl}
                onClick={() => avatarInputRef.current?.click()}
                className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs sm:text-sm font-semibold hover:bg-emerald-100 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                {avatarBusy ? "Отправляем…" : avatarEditUrl ? "Выберите кадр…" : "Загрузить аватар"}
              </button>
              <p className="text-[11px] text-gray-500 -mt-2 mb-2 max-w-[16rem]">JPEG, PNG, WebP или GIF до 8 МБ</p>

              <h2 className="font-bold text-lg lg:text-xl mb-1">{user.name}</h2>
              <p className="text-emerald-600 font-medium text-sm lg:text-base mb-1 flex items-center justify-center gap-1">
                <StethoscopeIcon className="w-4 h-4 shrink-0" />
                {user.specialty || "—"}
              </p>
              {badges.length > 0 && (
                <div className="mb-4 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">Ярлыки</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {badges.map((badge) => (
                      <div
                        key={badge.id + (badge.expiresAt ?? "")}
                        className={`px-3 py-1 rounded-full bg-gradient-to-r ${badge.color} text-white text-xs font-bold shadow-md flex flex-col items-center gap-0.5 min-w-[6rem]`}
                        title={
                          badge.source === "earned"
                            ? "Присвоен автоматически за активность или условие аккаунта"
                            : badge.expiresAt
                              ? `Подарок, до ${new Date(badge.expiresAt).toLocaleDateString("ru-RU")}`
                              : "Подарок"
                        }
                      >
                        <span className="flex items-center gap-1">
                          <span>{badge.icon}</span>
                          <span>{badge.name}</span>
                        </span>
                        {badge.source === "earned" ? (
                          <span className="text-[9px] font-normal opacity-90 leading-tight text-center">
                            Автоматически
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="w-full space-y-2 text-sm text-gray-600 text-left">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>{[user.city, user.country].filter(Boolean).join(", ") || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {daysOnPlatform != null
                      ? `На платформе: ${daysOnPlatform} ${formatDaysWord(daysOnPlatform)}`
                      : "На платформе: —"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-5 w-full">
                <button
                  type="button"
                  onClick={() => setBadgeStoreOpen(true)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium"
                >
                  <Gift className="w-4 h-4" />
                  Подарить ярлык
                </button>
                <button
                  type="button"
                  onClick={() => setTransferPointsOpen(true)}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg text-sm font-medium"
                >
                  <Send className="w-4 h-4" />
                  Перевод
                </button>
              </div>
            </div>
          </div>

          <VetPointsBalance />
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base lg:text-lg">Статистика</h3>
                <p className="text-xs text-gray-600 mt-0.5">Сводка активности аккаунта.</p>
              </div>
            </div>

            {st ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">На форуме: темы</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.forumThreadsCreated}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">На форуме: ответы</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.forumPostsCreated}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Решений</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.acceptedSolutionsCount}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Спасибо</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.thanksReceivedCount}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Статей</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.articlesPublished}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Комментов к статьям</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.articleCommentsCreated}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Объявлений</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.listingsCreated}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Сообщений по объявлениям</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.listingMessagesSent}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">SOS-запросов</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.sosRequestsCreated}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Чат (главная)</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.lobbyMessagesSent}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Личные сообщения</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{st.directMessagesSent}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Дней на платформе</div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums">{daysOnPlatform ?? "—"}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Статистика загрузится после обновления профиля.</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`flex-1 px-4 py-3 font-semibold text-sm lg:text-base transition-colors ${
                  activeTab === "overview" ? "bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600" : "text-gray-600"
                }`}
              >
                Обзор
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("assistant")}
                className={`flex-1 px-4 py-3 font-semibold text-sm lg:text-base transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "assistant" ? "bg-fuchsia-50 text-fuchsia-800 border-b-2 border-fuchsia-700" : "text-gray-600"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI помощник
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("points")}
                className={`flex-1 px-4 py-3 font-semibold text-sm lg:text-base transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "points" ? "bg-amber-50 text-amber-800 border-b-2 border-amber-600" : "text-gray-600"
                }`}
              >
                <Coins className="w-4 h-4" />
                VetCoin
              </button>
            </div>
          </div>

          {activeTab === "overview" ? (
            <div className="space-y-5">
              <div className="bg-white rounded-xl border border-gray-200 p-5 lg:p-6">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base lg:text-lg">Личные данные</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Имя, город, страна и должность сохраняются в вашем аккаунте и учитываются в публичном профиле.
                    </p>
                  </div>
                </div>

                {refsErr ? (
                  <p className="text-sm text-red-600 mb-3">{refsErr}</p>
                ) : null}

                <form className="space-y-4 max-w-xl" onSubmit={(ev) => void saveProfile(ev)}>
                  <label className="block text-sm">
                    <span className="font-medium text-gray-800">Отображаемое имя</span>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(ev) => setEditDisplayName(ev.target.value)}
                      maxLength={80}
                      disabled={refsLoading || !!refsErr || profileSaving}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      autoComplete="name"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-gray-800">Город</span>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(ev) => setEditCity(ev.target.value)}
                      maxLength={80}
                      disabled={refsLoading || !!refsErr || profileSaving}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      autoComplete="address-level2"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-gray-800">Страна</span>
                    <select
                      value={editCountryId}
                      onChange={(ev) => setEditCountryId(ev.target.value)}
                      disabled={refsLoading || !!refsErr || profileSaving}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white disabled:bg-gray-50"
                    >
                      <option value="">— Выберите —</option>
                      {countriesList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameRu}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-gray-800">Должность / специальность</span>
                    <select
                      value={editJobTitleId}
                      onChange={(ev) => setEditJobTitleId(ev.target.value)}
                      disabled={refsLoading || !!refsErr || profileSaving}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white disabled:bg-gray-50"
                    >
                      <option value="">— Выберите —</option>
                      {jobTitlesList.map((jt) => (
                        <option key={jt.id} value={jt.id}>
                          {jt.nameRu}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={profileSaving || refsLoading || !!refsErr}
                      className="inline-flex justify-center px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {profileSaving ? "Сохранение…" : refsLoading ? "Загрузка справочников…" : "Сохранить изменения"}
                    </button>
                    {profileSaveOk ? (
                      <span className="text-sm text-emerald-700 font-medium">Сохранено</span>
                    ) : null}
                  </div>
                  {profileFormErr ? <p className="text-sm text-red-600">{profileFormErr}</p> : null}
                </form>
              </div>

              <MedicalAnalyzerHistory />

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
                <div className="p-4 lg:p-5 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Уведомления</div>
                    <p className="text-xs text-gray-600">Локальные уведомления сбрасываются при выходе из аккаунта</p>
                  </div>
                </div>
                <div className="p-4 lg:p-5 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Настройки</div>
                    <p className="text-xs text-gray-600">Язык интерфейса — в шапке приложения</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "assistant" ? (
            <RoleAssistant />
          ) : (
            <VetPointsStats />
          )}
        </div>
      </div>

      {badgeStoreOpen && <BadgeStore onClose={() => setBadgeStoreOpen(false)} />}
      {transferPointsOpen && <TransferPoints onClose={() => setTransferPointsOpen(false)} />}
    </div>
  );
}
