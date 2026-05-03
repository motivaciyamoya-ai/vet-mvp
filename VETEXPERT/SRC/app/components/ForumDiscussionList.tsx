import { MessageSquare, ThumbsUp, Eye, Clock, MapPin, CheckCircle, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router";
import TranslatedContent from "./TranslatedContent";
import UserAvatar from "./UserAvatar";
import { ForumUrgencyBadge, ForumUrgencyDisc } from "./ForumUrgencyVisual";
import { assetUrl } from "../../lib/api";
import type { ForumDiscussionRow } from "../../lib/forumFeedMapping";

export default function ForumDiscussionList({
  discussions,
  emptyHint,
}: {
  discussions: ForumDiscussionRow[];
  emptyHint?: string;
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
