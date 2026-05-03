import { Clock, ArrowRight, Bookmark } from "lucide-react";
import { Link } from "react-router";
import { useEffect, useState } from "react";
import TranslatedContent from "./TranslatedContent";
import { DEMO_ARTICLES_HOME_RECENT } from "../../lib/demoArticles";
import { apiArticlesList, assetUrl } from "../../lib/api";
import type { ArticleListItem } from "../../lib/api";
import { articleCoverForId, approximateReadTimeRu } from "../../lib/articleCovers";

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[parts.length - 1][0] ?? "";
    return (a + b).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

export default function RecentArticles({ limit }: { limit?: number }) {
  const take = limit ?? 4;
  const [apiRows, setApiRows] = useState<ArticleListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiArticlesList({ pageSize: take })
      .then((r) => {
        if (!cancelled && r.items.length > 0) setApiRows(r.items);
        else if (!cancelled) setApiRows([]);
      })
      .catch(() => {
        if (!cancelled) setApiRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [take]);

  const categoryColors: Record<string, string> = {
    Диагностика: "bg-blue-100 text-blue-700",
    Эндокринология: "bg-purple-100 text-purple-700",
    Ортопедия: "bg-teal-100 text-teal-700",
    Онкология: "bg-red-100 text-red-700",
    Кардиология: "bg-rose-100 text-rose-800",
    Новости: "bg-amber-100 text-amber-800",
  };

  const useDemo = apiRows === null || apiRows.length === 0;
  const displayApi = !useDemo && apiRows ? apiRows.slice(0, take) : [];
  const displayDemo = useDemo ? DEMO_ARTICLES_HOME_RECENT.slice(0, take) : [];

  return (
    <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 sm:p-5 lg:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-600 rounded-xl flex items-center justify-center">
              <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg sm:text-xl lg:text-2xl text-gray-900">Новые статьи</h2>
              <p className="text-purple-700 text-xs sm:text-sm">
                {useDemo ? "Свежие публикации от коллег" : "Из базы платформы"}
              </p>
            </div>
          </div>
          <Link
            to="/articles"
            className="hidden sm:inline-flex items-center gap-1 text-purple-700 hover:text-purple-800 font-medium text-sm transition-colors"
          >
            Все статьи →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {!useDemo
          ? displayApi.map((article, index) => (
              <Link
                key={article.id}
                to={`/articles/${article.id}`}
                className={`group hover:bg-gray-50 transition-colors ${index >= 2 ? "md:col-span-1" : ""}`}
              >
                <div className="p-4 sm:p-5 lg:p-6">
                  <div className="relative h-40 sm:h-48 lg:h-56 rounded-lg overflow-hidden mb-4 bg-gray-200">
                    <img
                      src={articleCoverForId(article.id)}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          categoryColors[article.category.name] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {article.category.name}
                      </span>
                    </div>
                  </div>

                  <div>
                    <TranslatedContent
                      text={article.title}
                      originalLang="ru"
                      className="font-bold text-base sm:text-lg lg:text-xl mb-2 lg:mb-3 group-hover:text-purple-700 transition-colors line-clamp-2 leading-snug"
                    />

                    <TranslatedContent
                      text={article.excerpt}
                      originalLang="ru"
                      className="text-gray-600 text-sm lg:text-base mb-4 line-clamp-2 leading-relaxed"
                      showBadge={false}
                    />

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs flex-shrink-0 border border-purple-200">
                          {article.author.profile?.avatarUrl ? (
                            <img
                              src={assetUrl(article.author.profile.avatarUrl)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            authorInitials(article.author.profile?.displayName?.trim() || article.author.email)
                          )}
                        </div>
                        <div className="text-xs sm:text-sm min-w-0">
                          <div className="font-medium truncate">
                            {article.author.profile?.displayName?.trim() || article.author.email}
                          </div>
                          <div className="text-gray-500 flex items-center gap-2">
                            <span>
                              {new Date(article.createdAt).toLocaleDateString("ru-RU", { dateStyle: "medium" })}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {approximateReadTimeRu(article.excerpt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          : displayDemo.map((article, index) => (
              <Link
                key={article.id}
                to={`/articles/${article.id}`}
                className={`group hover:bg-gray-50 transition-colors ${index >= 2 ? "md:col-span-1" : ""}`}
              >
                <div className="p-4 sm:p-5 lg:p-6">
                  <div className="relative h-40 sm:h-48 lg:h-56 rounded-lg overflow-hidden mb-4 bg-gray-200">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          categoryColors[article.category] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {article.category}
                      </span>
                    </div>
                  </div>

                  <div>
                    <TranslatedContent
                      text={article.title}
                      originalLang={article.originalLang}
                      className="font-bold text-base sm:text-lg lg:text-xl mb-2 lg:mb-3 group-hover:text-purple-700 transition-colors line-clamp-2 leading-snug"
                    />

                    <TranslatedContent
                      text={article.excerpt}
                      originalLang={article.originalLang}
                      className="text-gray-600 text-sm lg:text-base mb-4 line-clamp-2 leading-relaxed"
                      showBadge={false}
                    />

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {authorInitials(article.author)}
                        </div>
                        <div className="text-xs sm:text-sm min-w-0">
                          <div className="font-medium truncate">{article.author}</div>
                          <div className="text-gray-500 flex items-center gap-2">
                            <span>{article.date}</span>
                            <span className="text-gray-400">•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {article.readTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200 sm:hidden">
        <Link
          to="/articles"
          className="block text-center text-sm font-medium text-purple-700 hover:text-purple-800 transition-colors"
        >
          Смотреть все статьи →
        </Link>
      </div>
    </div>
  );
}
