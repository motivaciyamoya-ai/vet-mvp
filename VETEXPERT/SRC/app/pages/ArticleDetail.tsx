import { ArrowLeft, Clock, User, MapPin, Briefcase } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { apiFetch, assetUrl } from "../../lib/api";
import TranslatedContent from "../components/TranslatedContent";
import ArticleCommentsSection from "../components/ArticleCommentsSection";
import ReportAbuseTrigger from "../components/ReportAbuseModal";
import { useAuth } from "../contexts/AuthContext";
import {
  DEMO_ARTICLES,
  getDemoArticleByIdParam,
  type DemoArticle,
} from "../../lib/demoArticles";
import { articleCoverForId } from "../../lib/articleCovers";

type ApiArticle = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  createdAt: string;
  category: { name: string; slug: string };
  author: {
    id: string;
    email: string;
    profile?: {
      displayName?: string | null;
      avatarUrl?: string | null;
      city?: string | null;
      country?: { nameRu?: string | null } | null;
      jobTitle?: { nameRu?: string | null } | null;
    } | null;
  };
};

type ViewState =
  | { status: "loading" }
  | { status: "api"; article: ApiArticle }
  | { status: "demo"; article: DemoArticle }
  | { status: "missing" };

function authorInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

/** Статья из API или демо (числовой id в URL для макета). */
export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    if (!id?.trim()) {
      setState({ status: "missing" });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      try {
        const article = await apiFetch<ApiArticle>(`/api/articles/${encodeURIComponent(id)}`);
        if (!cancelled) setState({ status: "api", article });
      } catch {
        const demo = getDemoArticleByIdParam(id);
        if (!cancelled) {
          if (demo) setState({ status: "demo", article: demo });
          else setState({ status: "missing" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-600">
        Загрузка статьи…
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="max-w-lg mx-auto space-y-6 text-center py-12">
        <h1 className="text-xl font-bold text-gray-900">Статья не найдена</h1>
        <p className="text-gray-600 text-sm">
          Проверьте ссылку или откройте список статей. В демо-режиме доступны номера:{" "}
          {DEMO_ARTICLES.map((a) => a.id).join(", ")}. После загрузки контента через seed статьи из базы
          имеют свой id в URL.
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-emerald-700 font-medium hover:underline"
        >
          Назад
        </button>
        <Link
          to="/articles"
          className="inline-block ml-4 text-emerald-700 font-medium hover:underline"
        >
          Все статьи
        </Link>
      </div>
    );
  }

  if (state.status === "api") {
    const a = state.article;
    const p = a.author.profile;
    const authorLabel = p?.displayName?.trim() || a.author.email;
    const avatar = assetUrl(p?.avatarUrl);
    const when = new Date(a.createdAt);
    const whenStr =
      Number.isFinite(when.getTime()) ? when.toLocaleDateString("ru-RU", { dateStyle: "long" }) : "—";
    const locationLine = [p?.city, p?.country?.nameRu].filter(Boolean).join(", ");
    const cover = articleCoverForId(a.id);

    return (
      <article className="max-w-3xl mx-auto space-y-8">
        <Link
          to="/articles"
          className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          К списку статей
        </Link>

        <div className="rounded-2xl overflow-hidden border border-emerald-100 shadow-lg bg-white">
          <div className="relative h-44 sm:h-56 bg-gray-200">
            <img src={cover} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
              <span className="bg-white/95 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold shadow">
                {a.category.name}
              </span>
              <span className="bg-black/40 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {whenStr}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-5 py-6 sm:px-8 sm:py-8 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/80 mb-3">Автор публикации</p>
            <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
              <Link
                to={`/users/${encodeURIComponent(a.author.id)}`}
                className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-4 border-white/40 shadow-xl bg-white/10 flex items-center justify-center"
              >
                {avatar ? (
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">{authorInitialsFromName(authorLabel)}</span>
                )}
              </Link>
              <div className="min-w-0 flex-1 space-y-2">
                <Link
                  to={`/users/${encodeURIComponent(a.author.id)}`}
                  className="text-2xl sm:text-3xl font-bold leading-tight hover:underline block"
                >
                  {authorLabel}
                </Link>
                {p?.jobTitle?.nameRu ? (
                  <p className="flex items-center gap-2 text-sm text-white/90">
                    <Briefcase className="w-4 h-4 shrink-0 opacity-80" />
                    {p.jobTitle.nameRu}
                  </p>
                ) : null}
                {locationLine ? (
                  <p className="flex items-center gap-2 text-sm text-white/85">
                    <MapPin className="w-4 h-4 shrink-0 opacity-80" />
                    {locationLine}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-bold text-2xl sm:text-4xl text-gray-900 leading-tight">{a.title}</h1>
            {authReady && user && user.id !== a.author.id ? (
              <ReportAbuseTrigger
                modalLabel={`Статья «${a.title.length > 120 ? `${a.title.slice(0, 120)}…` : a.title}»`}
                payload={{ targetType: "ARTICLE", articleId: a.id }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-800 hover:border-red-200"
              />
            ) : null}
          </div>
          <p className="text-lg text-gray-700 leading-relaxed border-l-4 border-emerald-400 pl-4 bg-emerald-50/40 py-3 rounded-r-lg">
            {a.excerpt}
          </p>
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{a.body}</div>
        </div>

        <ArticleCommentsSection articleId={a.id} />
      </article>
    );
  }

  const a = state.article;
  const cover = a.image;

  return (
    <article className="max-w-3xl mx-auto space-y-8">
      <Link
        to="/articles"
        className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        К списку статей
      </Link>

      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
        <div className="relative h-48 sm:h-64 bg-gray-200">
          <img src={cover} alt="" className="w-full h-full object-cover" />
          <span className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1 rounded-full text-sm font-semibold text-purple-800 shadow">
            {a.category}
          </span>
        </div>

        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-6 py-7 text-white border-b border-white/10">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/75 mb-3">Автор (демо)</p>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="w-20 h-20 rounded-2xl border-4 border-white/35 bg-white/15 flex items-center justify-center text-2xl font-bold shadow-lg">
              {authorInitialsFromName(a.author)}
            </div>
            <div>
              <p className="text-2xl font-bold">{a.author}</p>
              {a.location ? (
                <p className="flex items-center gap-2 text-sm text-white/85 mt-2">
                  <MapPin className="w-4 h-4" />
                  {a.location}
                </p>
              ) : null}
              <p className="flex items-center gap-2 text-sm text-white/80 mt-1">
                <Clock className="w-4 h-4" />
                {a.date} · {a.readTime}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-4">
          <TranslatedContent
            text={a.title}
            originalLang={a.originalLang}
            className="font-bold text-2xl sm:text-3xl text-gray-900 leading-tight block"
          />
          <TranslatedContent
            text={a.excerpt}
            originalLang={a.originalLang}
            className="text-gray-700 text-lg leading-relaxed block"
          />
          <TranslatedContent
            text={a.body}
            originalLang={a.originalLang}
            showBadge={false}
            className="whitespace-pre-wrap text-gray-800 leading-relaxed block border-t border-gray-100 pt-6 mt-6"
          />
          <p className="text-xs text-gray-500 pt-4 border-t border-gray-100 flex items-center gap-2">
            <User className="w-3.5 h-3.5" />
            Демо-материал: комментарии и профиль автора доступны для статей из базы после seed.
          </p>
        </div>
      </div>
    </article>
  );
}
