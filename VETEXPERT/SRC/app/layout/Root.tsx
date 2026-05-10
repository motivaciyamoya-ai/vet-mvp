import { Link, Outlet, NavLink, useLocation, useNavigate } from "react-router";
import {
  AlertCircle,
  Bell,
  Calendar,
  Coins,
  FileText,
  Home,
  Inbox,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  ShoppingBag,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import LanguageSelector from "../components/LanguageSelector";
import LanguageBanner from "../components/LanguageBanner";
import NotificationPanel from "../components/NotificationPanel";
import SiteAside from "../components/SiteAside";
import CookieConsentBanner from "../components/CookieConsentBanner";
import ModerationAccountBanner from "../components/ModerationAccountBanner";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
import { VetPointsProvider, useVetPoints } from "../contexts/VetPointsContext";
import { NotificationProvider, useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { FORUM_NEW_HOT_PATH } from "../../lib/forumHotTopicPath";
import {
  apiDirectUnreadSummary,
  apiReferenceMaintenance,
  apiReferenceSiteSeo,
  type PublicMaintenanceDto,
  type PublicSiteSeoDto,
} from "../../lib/api";
import { applyClientDocumentSeo, SITE_SEO_FALLBACK } from "../../lib/documentSeo";
import MaintenancePage from "../components/MaintenancePage";
import PageLoading from "../components/PageLoading";

function RootContent() {
  const navigate = useNavigate();
  const loc = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [dmUnread, setDmUnread] = useState(0);
  const { language } = useLanguage();
  const { balance, currencyDisplayName } = useVetPoints();
  const { unreadCount } = useNotifications();
  const { user, logout, isAuthenticated, authReady } = useAuth();
  const [siteSeo, setSiteSeo] = useState<PublicSiteSeoDto | null>(null);
  const [maintenance, setMaintenance] = useState<PublicMaintenanceDto | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const translations: Record<
    string,
    {
      home: string;
      forum: string;
      articles: string;
      events: string;
      tools: string;
      marketplace: string;
      messages: string;
      profile: string;
    }
  > = {
    ru: {
      home: "Главная",
      forum: "Форум",
      articles: "Статьи",
      events: "Мероприятия",
      tools: "AI-инструменты",
      marketplace: "Маркетплейс",
      messages: "Сообщения",
      profile: "Профиль",
    },
    en: {
      home: "Home",
      forum: "Forum",
      articles: "Articles",
      events: "Events",
      tools: "AI Tools",
      marketplace: "Marketplace",
      messages: "Messages",
      profile: "Profile",
    },
    uk: {
      home: "Головна",
      forum: "Форум",
      articles: "Статті",
      events: "Події",
      tools: "AI-інструменти",
      marketplace: "Маркетплейс",
      messages: "Повідомлення",
      profile: "Профіль",
    },
    de: {
      home: "Startseite",
      forum: "Forum",
      articles: "Artikel",
      events: "Veranstaltungen",
      tools: "KI-Tools",
      marketplace: "Marktplatz",
      messages: "Nachrichten",
      profile: "Profil",
    },
    fr: {
      home: "Accueil",
      forum: "Forum",
      articles: "Articles",
      events: "Évènements",
      tools: "Outils IA",
      marketplace: "Marketplace",
      messages: "Messages",
      profile: "Profil",
    },
    es: {
      home: "Inicio",
      forum: "Foro",
      articles: "Artículos",
      events: "Eventos",
      tools: "Herramientas IA",
      marketplace: "Mercado",
      messages: "Mensajes",
      profile: "Perfil",
    },
  };

  const t = translations[language] || translations.ru;

  const navBase = [
    { to: "/", icon: Home, label: t.home },
    { to: "/forum", icon: MessageSquare, label: t.forum },
    { to: "/articles", icon: FileText, label: t.articles },
    { to: "/events", icon: Calendar, label: t.events },
    { to: "/tools", icon: Stethoscope, label: t.tools },
    { to: "/marketplace", icon: ShoppingBag, label: t.marketplace },
  ];

  const navItems =
    authReady && isAuthenticated
      ? [...navBase, { to: "/messages", icon: Inbox, label: t.messages }]
      : [...navBase];

  useEffect(() => {
    let cancelled = false;
    apiReferenceSiteSeo()
      .then((r) => {
        if (!cancelled) setSiteSeo(r);
      })
      .catch(() => {
        if (!cancelled) setSiteSeo(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiReferenceMaintenance()
      .then((r) => {
        if (!cancelled) setMaintenance(r);
      })
      .catch(() => {
        if (!cancelled) setMaintenance(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let wentHidden = false;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        wentHidden = true;
        return;
      }
      if (document.visibilityState === "visible" && wentHidden) {
        wentHidden = false;
        apiReferenceSiteSeo()
          .then((r) => setSiteSeo(r))
          .catch(() => {});
        apiReferenceMaintenance()
          .then((r) => setMaintenance(r))
          .catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    applyClientDocumentSeo(loc.pathname, siteSeo ?? SITE_SEO_FALLBACK);
  }, [loc.pathname, siteSeo]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      setDmUnread(0);
      return;
    }
    let cancelled = false;
    const tick = () => {
      apiDirectUnreadSummary()
        .then((r) => {
          if (!cancelled) setDmUnread(r.unreadCount);
        })
        .catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, 45000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [authReady, isAuthenticated]);

  const maintenanceOn = maintenance?.enabled === true;
  const allowDuringMaintenance =
    loc.pathname.startsWith("/login") || user?.role === "ADMIN";

  if (maintenanceOn && !allowDuringMaintenance) {
    return <MaintenancePage title={maintenance?.title ?? "Технические работы"} message={maintenance?.message ?? ""} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-[0_1px_0_rgba(15,118,110,0.06)]">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex items-center gap-2 sm:gap-3 min-h-[3.5rem] sm:min-h-16 lg:min-h-[4.25rem]">
            <Link
              to="/"
              className="group flex shrink-0 items-center gap-2 sm:gap-3 min-w-0 rounded-xl py-1 pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              aria-label="VetConnect — на главную"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 shrink-0 bg-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-700 transition-colors">
                <span className="text-white font-bold text-lg sm:text-xl">V</span>
              </div>
              <span className="font-bold text-lg sm:text-xl lg:text-2xl text-gray-900 truncate">
                VetConnect
              </span>
            </Link>

            {/* Планшет/десктоп: навигация в прокрутке + фиксированная панель действий */}
            <div className="hidden md:flex flex-1 min-w-0 items-center gap-1 lg:gap-2">
              <div className="relative min-h-[2.75rem] flex flex-1 min-w-0 items-center rounded-xl bg-gray-50/90 ring-1 ring-gray-100 pl-1 pr-0.5">
                <nav
                  className="flex max-h-11 flex-nowrap items-center gap-0.5 overflow-x-auto overflow-y-hidden px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Основные разделы"
                >
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      title={item.label}
                      aria-label={item.label}
                      className={({ isActive }) =>
                        [
                          "relative shrink-0 flex items-center gap-1.5 2xl:gap-2 rounded-lg transition-colors whitespace-nowrap",
                          "px-2 py-2 2xl:px-4 2xl:py-2.5 text-sm 2xl:text-base",
                          isActive ? "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100" : "text-gray-700 hover:bg-white/70",
                        ].join(" ")
                      }
                    >
                      <item.icon className="w-4 h-4 2xl:w-5 2xl:h-5 shrink-0" aria-hidden />
                      <span className="hidden 2xl:inline">{item.label}</span>
                      {item.to === "/messages" && dmUnread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 2xl:top-1 2xl:right-1 min-w-[18px] h-[18px] px-0.5 flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full">
                          {dmUnread > 99 ? "99+" : dmUnread}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </nav>
              </div>

              <div className="flex shrink-0 items-center gap-0.5 lg:gap-1 pl-1 border-l border-gray-200/90">
                {!authReady ? (
                  <span className="text-xs text-gray-400 px-1 shrink-0 whitespace-nowrap">Сессия…</span>
                ) : isAuthenticated ? (
                  <>
                    <NavLink
                      to="/profile"
                      title={`Баланс: ${balance.toLocaleString()} · ${currencyDisplayName}`}
                      aria-label={`Профиль и баланс ${balance.toLocaleString()}`}
                      className="flex shrink-0 items-center gap-1 xl:gap-2 px-1.5 lg:px-2 py-2 2xl:px-4 2xl:py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
                    >
                      <Coins className="w-4 h-4 2xl:w-5 2xl:h-5 shrink-0" aria-hidden />
                      <span className="hidden lg:flex flex-col leading-tight text-left font-bold">
                        <span className="text-xs 2xl:text-sm tabular-nums">{balance.toLocaleString()}</span>
                        <span
                          className="hidden lg:block text-[9px] 2xl:text-[10px] font-medium opacity-90 truncate max-w-[5rem]"
                          title={currencyDisplayName}
                        >
                          {currencyDisplayName}
                        </span>
                      </span>
                    </NavLink>

                    <NavLink
                      to="/profile"
                      title="Профиль"
                      aria-label="Профиль"
                      className={({ isActive }) =>
                        [
                          "flex shrink-0 items-center justify-center p-2 2xl:px-3 rounded-lg transition-colors",
                          isActive ? "bg-emerald-50 text-emerald-800" : "text-gray-600 hover:bg-gray-100",
                        ].join(" ")
                      }
                    >
                      <User className="w-[18px] h-[18px] 2xl:w-5 2xl:h-5" aria-hidden />
                    </NavLink>

                    <button
                      type="button"
                      onClick={() => setNotificationPanelOpen(true)}
                      className="relative flex shrink-0 items-center justify-center p-2 2xl:px-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Уведомления"
                      aria-label="Уведомления"
                    >
                      <Bell className="w-[18px] h-[18px] 2xl:w-5 2xl:h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 min-w-[1.125rem] h-[18px] px-1 flex items-center justify-center bg-red-600 text-white text-[10px] font-bold rounded-full">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLogout()}
                      className="flex shrink-0 items-center justify-center p-2 2xl:px-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Выйти"
                      aria-label="Выйти"
                    >
                      <LogOut className="w-[18px] h-[18px] 2xl:w-5 2xl:h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/profile"
                      title="Профиль"
                      aria-label="Профиль"
                      className={({ isActive }) =>
                        [
                          "flex shrink-0 items-center justify-center p-2 2xl:px-3 rounded-lg transition-colors",
                          isActive ? "bg-emerald-50 text-emerald-800" : "text-gray-600 hover:bg-gray-100",
                        ].join(" ")
                      }
                    >
                      <User className="w-[18px] h-[18px] 2xl:w-5 2xl:h-5" aria-hidden />
                    </NavLink>
                    <NavLink
                      to="/login"
                      title="Войти"
                      aria-label="Войти"
                      className="flex shrink-0 items-center gap-1.5 px-2 py-2 2xl:px-4 2xl:py-2.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors font-medium text-sm"
                    >
                      <LogIn className="w-4 h-4 2xl:w-5 2xl:h-5 shrink-0" aria-hidden />
                      <span className="hidden xl:inline">Войти</span>
                    </NavLink>
                  </>
                )}

                <LanguageSelector compact />
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden ml-auto shrink-0 p-2 rounded-lg hover:bg-gray-100"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 border-t border-gray-200 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {item.to === "/messages" && dmUnread > 0 ? (
                    <span className="ml-auto bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[22px] text-center">
                      {dmUnread > 99 ? "99+" : dmUnread}
                    </span>
                  ) : null}
                </NavLink>
              ))}
              {authReady && (
                <div className="px-4 pt-2 border-t border-gray-100 mt-2 space-y-2">
                  {isAuthenticated ? (
                    <>
                      <NavLink
                        to="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold"
                      >
                        <Coins className="w-5 h-5" />
                        {balance.toLocaleString()} {currencyDisplayName}
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setNotificationPanelOpen(true);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
                      >
                        <Bell className="w-5 h-5" />
                        Уведомления
                        {unreadCount > 0 ? (
                          <span className="ml-auto text-xs font-bold bg-red-600 text-white rounded-full px-2 py-0.5">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="w-5 h-5" />
                        Выйти
                      </button>
                    </>
                  ) : (
                    <NavLink
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-emerald-700 font-semibold hover:bg-emerald-50"
                    >
                      <LogIn className="w-5 h-5" />
                      Войти
                    </NavLink>
                  )}
                </div>
              )}
              <div className="px-4 pt-2">
                <LanguageSelector />
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main + правый узкий столбец: сводка, общий чат и т.д. */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 sm:py-6 lg:py-8 xl:py-10">
        <ModerationAccountBanner />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_min(288px,max(26vw,240px))] xl:grid-cols-[minmax(0,1fr)_308px] gap-6 lg:gap-8 items-start">
          <div className="min-w-0 order-1">
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </div>
          <aside
            aria-label="Боковая панель"
            className="order-2 hidden lg:block lg:sticky lg:top-[4.75rem] self-start w-full max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain [scrollbar-width:thin]"
          >
            <SiteAside />
          </aside>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 text-xs sm:text-sm text-slate-600 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <p className="truncate">© {new Date().getFullYear()} VetConnect</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <a className="hover:underline" href="/privacy">
              Политика конфиденциальности
            </a>
            <a className="hover:underline" href="/cookies">
              Cookies
            </a>
          </div>
        </div>
      </footer>

      <CookieConsentBanner />

      {/* Language Banner */}
      <LanguageBanner />

      {/* Notification Panel */}
      {notificationPanelOpen && <NotificationPanel onClose={() => setNotificationPanelOpen(false)} />}
    </div>
  );
}

export default function Root() {
  return (
    <LanguageProvider>
      <VetPointsProvider>
        <NotificationProvider>
          <RootContent />
        </NotificationProvider>
      </VetPointsProvider>
    </LanguageProvider>
  );
}
