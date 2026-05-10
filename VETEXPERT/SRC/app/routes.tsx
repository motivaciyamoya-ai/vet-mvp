import { lazy } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import Root from "./layout/Root";
import Home from "./pages/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import VerifyEmail from "./components/VerifyEmail";
import Articles from "./components/Articles";
import RouteErrorBoundary from "./components/RouteErrorBoundary";

const Forum = lazy(() => import("./pages/Forum"));
const ForumCategoryPage = lazy(() => import("./pages/ForumCategoryPage"));
const ForumTopicDetail = lazy(() => import("./components/ForumTopicDetail"));
const Specialists = lazy(() => import("./components/Specialists"));
const Profile = lazy(() => import("./components/Profile"));
const Tools = lazy(() => import("./components/Tools"));
const MarketplacePage = lazy(() => import("./components/MarketplacePage"));
const NotFound = lazy(() => import("./components/NotFound"));
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./admin/AdminUsers"));
const AdminForum = lazy(() => import("./admin/AdminForum"));
const AdminForumLayout = lazy(() => import("./admin/forum/AdminForumLayout"));
const AdminForumModeration = lazy(() => import("./admin/forum/AdminForumModeration"));
const AdminForumAnnouncements = lazy(() => import("./admin/forum/AdminForumAnnouncements"));
const AdminForumAttachments = lazy(() => import("./admin/forum/AdminForumAttachments"));
const AdminArticles = lazy(() => import("./admin/AdminArticles"));
const AdminMarketplace = lazy(() => import("./admin/AdminMarketplace"));
const AdminReports = lazy(() => import("./admin/AdminReports"));
const AdminSos = lazy(() => import("./admin/AdminSos"));
const AdminReference = lazy(() => import("./admin/AdminReference"));
const AdminPush = lazy(() => import("./admin/AdminPush"));
const AdminSettings = lazy(() => import("./admin/AdminSettings"));
const AdminSeo = lazy(() => import("./admin/AdminSeo"));
const AdminMaintenance = lazy(() => import("./admin/AdminMaintenance"));
const AdminVetCoins = lazy(() => import("./admin/AdminVetCoins"));
const AdminDosageDrugs = lazy(() => import("./admin/AdminDosageDrugs"));
const AdminEvents = lazy(() => import("./admin/AdminEvents"));
const AdminSecurity = lazy(() => import("./admin/AdminSecurity"));
const AdminAiTools = lazy(() => import("./admin/AdminAiTools"));
const AdminServerStats = lazy(() => import("./admin/AdminServerStats"));
const AdminMail = lazy(() => import("./admin/AdminMail"));
const AdminLegal = lazy(() => import("./admin/AdminLegal"));
const UserPublicProfile = lazy(() => import("./pages/UserPublicProfile"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const MarketplaceListingDetail = lazy(() => import("./pages/MarketplaceListingDetail"));
const EventsPage = lazy(() => import("./pages/EventsPage"));
const EventDetailPage = lazy(() => import("./pages/EventDetailPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));

function RouterShell() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    id: "app-shell",
    Component: RouterShell,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/login",
        Component: Login,
      },
      {
        path: "/register",
        Component: Register,
      },
      {
        path: "/verify-email",
        Component: VerifyEmail,
      },
      {
        path: "/admin",
        Component: AdminLayout,
        children: [
          { index: true, Component: AdminDashboard },
          { path: "server-stats", Component: AdminServerStats },
          { path: "users", Component: AdminUsers },
          {
            path: "forum",
            Component: AdminForumLayout,
            children: [
              { index: true, element: <Navigate to="management" replace /> },
              { path: "management", element: <AdminForum activeView="structure" /> },
              { path: "threads", element: <AdminForum activeView="threads" /> },
              { path: "announcements", Component: AdminForumAnnouncements },
              { path: "moderation", Component: AdminForumModeration },
              { path: "attachments", Component: AdminForumAttachments },
            ],
          },
          { path: "articles", Component: AdminArticles },
          { path: "events", Component: AdminEvents },
          { path: "marketplace", Component: AdminMarketplace },
          { path: "reports", Component: AdminReports },
          { path: "sos", Component: AdminSos },
          { path: "reference", Component: AdminReference },
          {
            path: "dosage-drugs",
            Component: AdminDosageDrugs,
            errorElement: (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950 max-w-2xl">
                <h1 className="text-lg font-semibold tracking-tight">
                  Не удалось открыть раздел «Препараты · дозы»
                </h1>
                <p className="text-sm mt-2 text-amber-900/90">
                  Обновите страницу или попробуйте позже. Если ошибка сохранится — сообщите администратору.
                  {import.meta.env.DEV ? (
                    <span className="block mt-2 text-xs text-amber-900/75">
                      <span className="font-semibold">DEV:</span> при пустых таблицах справочника проверьте миграции API и
                      его перезапуск.
                    </span>
                  ) : null}
                </p>
              </div>
            ),
          },
          { path: "push", Component: AdminPush },
          { path: "maintenance", Component: AdminMaintenance },
          { path: "seo", Component: AdminSeo },
          { path: "legal", Component: AdminLegal },
          { path: "settings", Component: AdminSettings },
          { path: "vetcoins", Component: AdminVetCoins },
          { path: "security", Component: AdminSecurity },
          { path: "ai-tools", Component: AdminAiTools },
          { path: "mail", Component: AdminMail },
        ],
      },
      {
        path: "/",
        Component: Root,
        children: [
          { index: true, Component: Home },
          { path: "forum", Component: Forum },
          { path: "forum/category/:slug", Component: ForumCategoryPage },
          { path: "forum/topic/:id", Component: ForumTopicDetail },
          { path: "articles", Component: Articles },
          { path: "articles/:id", Component: ArticleDetail },
          { path: "events", Component: EventsPage },
          { path: "events/:id", Component: EventDetailPage },
          { path: "specialists", Component: Specialists },
          { path: "tools", Component: Tools },
          { path: "marketplace", Component: MarketplacePage },
          { path: "marketplace/:id", Component: MarketplaceListingDetail },
          { path: "profile", Component: Profile },
          { path: "users/:userId", Component: UserPublicProfile },
          { path: "messages", Component: MessagesPage },
          { path: "messages/:conversationId", Component: MessagesPage },
          { path: "privacy", Component: PrivacyPolicy },
          { path: "cookies", Component: CookiePolicy },
          { path: "*", Component: NotFound },
        ],
      },
    ],
  },
]);
