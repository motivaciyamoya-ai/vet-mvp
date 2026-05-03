import { Clock, User, BookmarkPlus, Share2, X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useEffect, useMemo, useState } from "react";
import TranslatedContent from "./TranslatedContent";
import GuestPublishGate from "./GuestPublishGate";
import { useAuth } from "../contexts/AuthContext";
import { DEMO_ARTICLES_ARTICLES_PAGE } from "../../lib/demoArticles";
import { apiArticleCategories, apiArticlesList, assetUrl, type ArticleCategoryDto, type ArticleListItem } from "../../lib/api";
import { articleCoverForId, approximateReadTimeRu } from "../../lib/articleCovers";

type CardModel = {
  id: string;
  title: string;
  excerpt: string;
  categoryLabel: string;
  readTimeLabel: string;
  dateLabel: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  imageUrl: string;
  originalLang?: string;
};

export default function Articles() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [articleHelpOpen, setArticleHelpOpen] = useState(false);
  const [fromApi, setFromApi] = useState<boolean | null>(null);
  const [apiItems, setApiItems] = useState<ArticleListItem[]>([]);
  const [apiCats, setApiCats] = useState<ArticleCategoryDto[]>([]);
  const [loadErr, setLoadErr] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedDemoCategory, setSelectedDemoCategory] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadErr("");
    (async () => {
      try {
        const [cats, list] = await Promise.all([
          apiArticleCategories(),
          apiArticlesList({ pageSize: 100 }),
        ]);
        if (cancelled) return;
        if (list.items.length > 0) {
          setFromApi(true);
          setApiItems(list.items);
          setApiCats(cats);
        } else {
          setFromApi(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setFromApi(false);
          setLoadErr(e instanceof Error ? e.message : "Не удалось загрузить статьи с сервера");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const demoCategories = useMemo(() => {
    const set = new Set<string>();
    for (const a of DEMO_ARTICLES_ARTICLES_PAGE) set.add(a.category);
    return ["Все", ...Array.from(set).sort((a, b) => a.localeCompare(b, "ru"))];
  }, []);

  const apiCategoryButtons = useMemo(() => {
    const sorted = [...apiCats].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "ru"));
    return [{ label: "Все", slug: null as string | null }, ...sorted.map((c) => ({ label: c.name, slug: c.slug }))];
  }, [apiCats]);

  const cards: CardModel[] = useMemo(() => {
    if (fromApi === true) {
      const rows = selectedSlug ? apiItems.filter((a) => a.category.slug === selectedSlug) : apiItems;
      return rows.map((a) => ({
        id: a.id,
        title: a.title,
        excerpt: a.excerpt,
        categoryLabel: a.category.name,
        readTimeLabel: approximateReadTimeRu(a.excerpt),
        dateLabel: new Date(a.createdAt).toLocaleDateString("ru-RU", { dateStyle: "medium" }),
        authorName: a.author.profile?.displayName?.trim() || a.author.email,
        authorAvatarUrl: a.author.profile?.avatarUrl,
        imageUrl: articleCoverForId(a.id),
        originalLang: "ru",
      }));
    }
    const demo = DEMO_ARTICLES_ARTICLES_PAGE.filter(
      (a) => !selectedDemoCategory || a.category === selectedDemoCategory,
    );
    return demo.map((a) => ({
      id: String(a.id),
      title: a.title,
      excerpt: a.excerpt,
      categoryLabel: a.category,
      readTimeLabel: a.readTime,
      dateLabel: a.date,
      authorName: a.author,
      authorAvatarUrl: null,
      imageUrl: a.image,
      originalLang: a.originalLang,
    }));
  }, [fromApi, apiItems, selectedSlug, selectedDemoCategory]);

  const onWriteArticleClick = () => {
    const r = user?.role?.toUpperCase();
    if (r === "ADMIN" || r === "MODERATOR") {
      navigate("/admin/articles");
      return;
    }
    setArticleHelpOpen(true);
  };

  return (
    <div className="space-y-5 lg:space-y-6 xl:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-bold text-xl sm:text-2xl lg:text-3xl mb-1">Статьи</h1>
          <p className="text-gray-600 text-sm lg:text-base">
            {fromApi === true
              ? "Материалы из базы VetConnect — редактируются в админ-панели"
              : "Профессиональные публикации от коллег (демо или офлайн-режим)"}
          </p>
        </div>
        <GuestPublishGate promptClassName="w-full sm:max-w-lg sm:text-left">
          <button
            type="button"
            onClick={onWriteArticleClick}
            className="w-full sm:w-auto bg-emerald-600 text-white px-5 py-2.5 lg:px-6 lg:py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm lg:text-base whitespace-nowrap"
          >
            Написать статью
          </button>
        </GuestPublishGate>
      </div>

      {loadErr && fromApi === false && (
        <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{loadErr}</p>
      )}

      <div className="flex flex-nowrap gap-2 lg:gap-3 overflow-x-auto overflow-y-hidden pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {fromApi === true
          ? apiCategoryButtons.map((c) => (
              <button
                key={c.slug ?? "__all__"}
                type="button"
                onClick={() => setSelectedSlug(c.slug)}
                className={`px-3 py-2 lg:px-4 lg:py-2.5 rounded-lg whitespace-nowrap transition-colors text-sm lg:text-base shrink-0 ${
                  selectedSlug === c.slug
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {c.label}
              </button>
            ))
          : demoCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedDemoCategory(category === "Все" ? null : category)}
                className={`px-3 py-2 lg:px-4 lg:py-2.5 rounded-lg whitespace-nowrap transition-colors text-sm lg:text-base shrink-0 ${
                  (category === "Все" && selectedDemoCategory === null) || category === selectedDemoCategory
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {category}
              </button>
            ))}
      </div>

      {cards.length === 0 ? (
        <p className="text-center text-gray-600 py-12 bg-white rounded-xl border border-gray-200">
          В этой категории пока нет материалов.
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6 xl:gap-8">
        {cards.map((article) => (
          <Link
            key={article.id}
            to={`/articles/${article.id}`}
            className="bg-white rounded-lg lg:rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
          >
            <div className="h-40 sm:h-48 lg:h-56 bg-gray-200 overflow-hidden shrink-0 relative">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
              {fromApi === true && (
                <span className="absolute bottom-3 left-3 text-[10px] font-medium uppercase tracking-wide bg-black/55 text-white px-2 py-0.5 rounded">
                  Из базы
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5 lg:p-6 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full text-xs lg:text-sm font-medium">
                  {article.categoryLabel}
                </span>
                <span className="flex items-center gap-1 text-xs lg:text-sm text-gray-500">
                  <Clock className="w-3 h-3 lg:w-4 lg:h-4" />
                  {article.readTimeLabel}
                </span>
              </div>

              <TranslatedContent
                text={article.title}
                originalLang={article.originalLang ?? "ru"}
                className="font-bold text-base sm:text-lg lg:text-xl mb-2 lg:mb-3 hover:text-emerald-600 transition-colors leading-snug line-clamp-2 block"
              />

              <TranslatedContent
                text={article.excerpt}
                originalLang={article.originalLang ?? "ru"}
                className="text-gray-600 text-sm lg:text-base mb-4 line-clamp-2 leading-relaxed block"
                showBadge={false}
              />

              <div className="flex items-center justify-between pt-3 lg:pt-4 border-t border-gray-100 mt-auto">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 lg:w-9 lg:h-9 bg-emerald-100 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-emerald-200">
                    {article.authorAvatarUrl ? (
                      <img
                        src={assetUrl(article.authorAvatarUrl)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="text-sm lg:text-base min-w-0">
                    <div className="font-medium truncate">{article.authorName}</div>
                    <div className="text-gray-500 text-xs lg:text-sm">{article.dateLabel}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    title="Сохранить"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <BookmarkPlus className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    title="Поделиться"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <Share2 className="w-4 h-4 lg:w-5 lg:h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {articleHelpOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="article-help-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl p-6 relative">
            <button
              type="button"
              onClick={() => setArticleHelpOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 id="article-help-title" className="font-bold text-lg pr-10 mb-2">
              Публикация статей
            </h2>
            <p className="text-gray-700 text-sm leading-relaxed mb-3">
              В&nbsp;этой версии платформы новые статьи в&nbsp;общий раздел добавляют только{" "}
              <strong>администраторы и модераторы</strong> через админ-панель. Специалисты могут делиться опытом в{" "}
              <Link to="/forum" className="text-emerald-700 font-medium hover:underline" onClick={() => setArticleHelpOpen(false)}>
                темах форума
              </Link>
              .
            </p>
            <p className="text-gray-600 text-sm">
              Если вам нужна публикация как статья — договоритесь с администрацией клиники или модератором площадки.
            </p>
            <button
              type="button"
              onClick={() => setArticleHelpOpen(false)}
              className="mt-6 w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
