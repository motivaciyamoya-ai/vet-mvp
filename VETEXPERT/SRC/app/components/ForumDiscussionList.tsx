import { MessageSquare, ThumbsUp, Eye, Clock, MapPin, CheckCircle, Sparkles, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router";
import TranslatedContent from "./TranslatedContent";
import UserAvatar from "./UserAvatar";
import { ForumUrgencyBadge, ForumUrgencyDisc } from "./ForumUrgencyVisual";
import { assetUrl } from "../../lib/api";
import type { ForumDiscussionRow } from "../../lib/forumFeedMapping";

export type ForumDiscussionListVariant = "comfortable" | "compact";

export default function ForumDiscussionList({
  discussions,
  emptyHint,
  variant = "comfortable",
  tone = "emerald",
}: {
  discussions: ForumDiscussionRow[];
  emptyHint?: string;
  variant?: ForumDiscussionListVariant;
  /** Только для `compact`: цвет шапки таблицы и лёгкий акцент строк. */
  tone?: "emerald" | "hot";
}) {
  const navigate = useNavigate();

  if (discussions.length === 0) {
    return (
      <div className="text-center py-12 lg:py-16 px-4">
        <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">{emptyHint ?? "Тем пока нет"}</p>
      </div>
    );
  }

  if (variant === "compact") {
    const theadGradient =
      tone === "hot"
        ? "bg-gradient-to-r from-red-700 via-red-700 to-orange-700"
        : "bg-gradient-to-r from-emerald-700 via-emerald-700 to-teal-700";
    const rowHoverMuted =
      tone === "hot" ? "sm:hover:bg-red-50/50" : "sm:hover:bg-emerald-50/45";

    return (
      <div className="text-sm">
        {/* Шапка в стиле классической доски объявлений */}
        <div
          className={`hidden sm:grid sm:grid-cols-[44px_minmax(0,1fr)_6.75rem_minmax(0,12.75rem)] ${theadGradient} text-white shadow-sm`}
        >
          <div className="px-3 py-2.5 border-r border-white/15 flex items-center justify-center">
            <span className="sr-only">Статус</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">Ст.</span>
          </div>
          <div className="px-3 py-2.5 border-r border-white/15 text-[11px] font-semibold uppercase tracking-wide flex items-center">
            Тема / автор
          </div>
          <div className="px-3 py-2.5 border-r border-white/15 text-[11px] font-semibold uppercase tracking-wide text-right flex items-center justify-end">
            Статистика
          </div>
          <div className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide flex items-center">
            Последнее сообщение
          </div>
        </div>

        <div className="divide-y divide-slate-200 bg-white">
          {discussions.map((discussion, rowIdx) => (
            <div
              key={String(discussion.id)}
              className={`grid grid-cols-[36px_1fr] sm:grid-cols-[44px_minmax(0,1fr)_6.75rem_minmax(0,12.75rem)] gap-x-2 gap-y-1.5 px-2.5 sm:px-0 py-2.5 sm:py-0 sm:items-stretch cursor-pointer transition-colors ${
                discussion.isClosed
                  ? "bg-emerald-50/35 hover:bg-emerald-50/65"
                  : discussion.isHot && !discussion.isClosed
                    ? "bg-red-50/25 hover:bg-red-50/50"
                    : rowIdx % 2 === 1
                      ? `bg-slate-50/50 hover:bg-emerald-50/30 ${rowHoverMuted}`
                      : `hover:bg-slate-50/90 hover:bg-emerald-50/20 ${rowHoverMuted}`
              }`}
              onClick={() => navigate(`/forum/topic/${discussion.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(`/forum/topic/${discussion.id}`);
                }
              }}
            >
              <div className="col-start-1 row-start-1 flex justify-center sm:justify-center sm:border-r sm:border-slate-100 sm:py-2.5 pt-0.5">
                {discussion.isClosed ? (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-600 shadow-md ring-2 ring-white">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                ) : discussion.isHot && discussion.urgency ? (
                  <ForumUrgencyDisc level={discussion.urgency} className="w-9 h-9 ring-2 ring-white shadow-md" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-50 border border-emerald-200/90 shadow-sm">
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                  </div>
                )}
              </div>

              <div className="col-start-2 row-start-1 min-w-0 sm:col-start-2 sm:px-3 sm:py-2.5 sm:border-r sm:border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  {discussion.isClosed && (
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold uppercase shadow-sm">
                      Решена
                    </span>
                  )}
                  {discussion.isHot && !discussion.isClosed && discussion.urgency && (
                    <ForumUrgencyBadge level={discussion.urgency} />
                  )}
                  <span className="text-[11px] text-slate-600 bg-white border border-slate-200/90 px-1.5 py-0.5 rounded-md font-medium shadow-sm">
                    {discussion.category}
                  </span>
                  {discussion.coverThumb ? (
                    <span className="sm:hidden ml-auto shrink-0 w-11 h-11 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                      <img src={assetUrl(discussion.coverThumb)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </span>
                  ) : null}
                </div>
                {discussion.isClosed && discussion.solvedBy && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs text-emerald-900">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" aria-hidden />
                    <UserAvatar
                      avatarUrl={discussion.solvedBy.avatarUrl}
                      label={discussion.solvedBy.name}
                      className="w-6 h-6"
                      ringClassName="ring-1 ring-emerald-200"
                    />
                    <span className="truncate font-semibold">{discussion.solvedBy.name}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <TranslatedContent
                      text={discussion.title}
                      originalLang={discussion.originalLang}
                      className={`font-semibold text-[15px] sm:text-sm leading-snug line-clamp-2 tracking-tight ${
                        discussion.isHot && !discussion.isClosed ? "text-red-950" : "text-slate-900"
                      }`}
                    />
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
                      <span className="font-medium text-slate-800">{discussion.author}</span>
                      <span className="text-slate-300">·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 shrink-0 text-emerald-600/80" />
                        {discussion.location}
                      </span>
                    </div>
                  </div>
                  {discussion.coverThumb ? (
                    <div className="hidden sm:block shrink-0 w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shadow-sm mt-0.5">
                      <img src={assetUrl(discussion.coverThumb)} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className="col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1 text-xs tabular-nums sm:text-right sm:px-3 sm:py-2.5 sm:border-r sm:border-slate-100 border-t border-slate-100 sm:border-t-0 pt-2 sm:pt-2 text-slate-700"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex sm:flex-col sm:items-end gap-x-4 gap-y-1 sm:gap-y-1.5">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-500 sm:hidden">Ответы </span>
                    {discussion.replies}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-500 sm:hidden">Просмотры </span>
                    {discussion.views}
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-800/90">
                    <ThumbsUp className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-slate-500 sm:hidden">Лайки </span>
                    {discussion.likes}
                  </span>
                </div>
              </div>

              <div
                className="col-span-2 col-start-1 row-start-3 sm:col-span-1 sm:col-start-4 text-xs text-slate-600 min-w-0 sm:px-3 sm:py-2.5 border-t border-slate-100 sm:border-t-0 pt-2 sm:pt-2 group/last"
                onClick={(e) => e.stopPropagation()}
              >
                {discussion.latestComment ? (
                  <>
                    <p className="text-slate-800 line-clamp-2 leading-snug">{discussion.latestComment.body}</p>
                    <p className="mt-1.5 text-[11px] text-slate-500 flex flex-wrap items-center gap-x-1">
                      <span className="font-semibold text-slate-700">{discussion.latestComment.authorLabel}</span>
                      <Clock className="w-3 h-3 shrink-0 text-slate-400" />
                      <span>{discussion.latestComment.relativeTime}</span>
                      {discussion.latestComment.authorUserId ? (
                        <>
                          <span className="text-slate-300">·</span>
                          <Link
                            className="text-emerald-700 font-semibold hover:underline"
                            to={`/users/${discussion.latestComment.authorUserId}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            профиль
                          </Link>
                        </>
                      ) : null}
                      <ChevronRight className="w-4 h-4 text-emerald-500 ml-auto opacity-70 group-hover/last:translate-x-0.5 transition-transform hidden sm:inline" />
                    </p>
                  </>
                ) : (
                  <p className="flex flex-wrap items-center gap-1">
                    <span className="text-slate-400">Обновлено</span>
                    <span className="font-semibold text-slate-800">{discussion.time}</span>
                    <ChevronRight className="w-4 h-4 text-emerald-500 ml-auto opacity-70 hidden sm:inline" />
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* comfortable (прежний карточный вид) */
  return (
    <div className="divide-y divide-gray-200">
      {discussions.map((discussion) => (
        <div
          key={String(discussion.id)}
          onClick={() => navigate(`/forum/topic/${discussion.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(`/forum/topic/${discussion.id}`);
            }
          }}
          className={`p-4 sm:p-5 lg:p-6 xl:p-8 transition-colors cursor-pointer ${
            discussion.isClosed
              ? "bg-green-50/30 hover:bg-green-50/50 border-l-4 border-l-green-500"
              : discussion.isHot
                ? "bg-red-50/30 hover:bg-red-50/50 border-l-4 border-l-red-500"
                : "hover:bg-gray-50"
          }`}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0">
              {discussion.isClosed ? (
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>
              ) : discussion.isHot && discussion.urgency ? (
                <ForumUrgencyDisc
                  level={discussion.urgency}
                  className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-emerald-100">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-emerald-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {discussion.isClosed && (
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold shadow-md flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Решена
                  </span>
                )}
                {discussion.isHot && !discussion.isClosed && discussion.urgency && (
                  <ForumUrgencyBadge level={discussion.urgency} />
                )}
              </div>

              {discussion.isClosed && discussion.solvedBy && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-3 mb-2 shadow-sm">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" aria-hidden />
                  <UserAvatar
                    avatarUrl={discussion.solvedBy.avatarUrl}
                    label={discussion.solvedBy.name}
                    className="w-9 h-9"
                    ringClassName="ring-2 ring-emerald-200"
                  />
                  <div className="text-xs leading-tight min-w-0">
                    <span className="font-semibold text-emerald-800 block">Помог разобраться</span>
                    <span className="font-bold text-emerald-950 truncate block">{discussion.solvedBy.name}</span>
                  </div>
                </div>
              )}

              <TranslatedContent
                text={discussion.title}
                originalLang={discussion.originalLang}
                className={`font-semibold text-base sm:text-lg lg:text-xl mb-2 lg:mb-3 transition-colors leading-snug ${
                  discussion.isHot && !discussion.isClosed ? "hover:text-red-700" : "hover:text-emerald-600"
                }`}
              />

              {discussion.latestComment ? (
                <div
                  className="mb-2 lg:mb-3 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 text-xs sm:text-sm"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                    Последний комментарий
                  </p>
                  <p className="text-slate-800 leading-snug line-clamp-2">{discussion.latestComment.body}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{discussion.latestComment.authorLabel}</span>
                    <span className="text-slate-400">·</span>
                    <span>{discussion.latestComment.relativeTime}</span>
                    {discussion.latestComment.authorUserId ? (
                      <>
                        <span className="text-slate-400 hidden sm:inline">·</span>
                        <Link
                          className="text-emerald-700 font-medium hover:underline"
                          to={`/users/${discussion.latestComment.authorUserId}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          профиль
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4 text-xs sm:text-sm lg:text-base text-gray-600 mb-2 lg:mb-3">
                <span className="font-medium text-gray-900">{discussion.author}</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                  {discussion.location}
                </span>
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                  {discussion.category}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-5 text-xs sm:text-sm lg:text-base text-gray-500">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                  {discussion.replies} ответов
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  {discussion.views}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  {discussion.likes}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  {discussion.time}
                </span>
              </div>
            </div>

            {discussion.coverThumb ? (
              <div className="w-14 h-14 sm:w-[4.75rem] sm:h-[4.75rem] rounded-xl overflow-hidden border-2 border-white shadow-md shrink-0 ring-1 ring-gray-200 self-start">
                <img
                  src={assetUrl(discussion.coverThumb)}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
