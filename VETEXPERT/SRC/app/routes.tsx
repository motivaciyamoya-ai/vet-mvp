import { createBrowserRouter } from "react-router";
import Root from "./layout/Root";
import Home from "./pages/Home";
import Forum from "./pages/Forum";
import ForumCategoryPage from "./pages/ForumCategoryPage";
import ForumTopicDetail from "./components/ForumTopicDetail";
import Articles from "./components/Articles";
import Specialists from "./components/Specialists";
import Profile from "./components/Profile";
import Tools from "./components/Tools";
import MarketplacePage from "./components/MarketplacePage";
import Login from "./components/Login";
import Register from "./components/Register";
import VerifyEmail from "./components/VerifyEmail";
import NotFound from "./components/NotFound";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/AdminUsers";
import AdminForum from "./admin/AdminForum";
import AdminArticles from "./admin/AdminArticles";
import AdminMarketplace from "./admin/AdminMarketplace";
import AdminReports from "./admin/AdminReports";
import AdminSos from "./admin/AdminSos";
import AdminReference from "./admin/AdminReference";
import AdminPush from "./admin/AdminPush";
import AdminSettings from "./admin/AdminSettings";
import AdminVetCoins from "./admin/AdminVetCoins";
import AdminDosageDrugs from "./admin/AdminDosageDrugs";
import AdminEvents from "./admin/AdminEvents";
import UserPublicProfile from "./pages/UserPublicProfile";
import MessagesPage from "./pages/MessagesPage";
import ArticleDetail from "./pages/ArticleDetail";
import MarketplaceListingDetail from "./pages/MarketplaceListingDetail";
import EventsPage from "./pages/EventsPage";
import EventDetailPage from "./pages/EventDetailPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";

export const router = createBrowserRouter([
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
      { path: "users", Component: AdminUsers },
      { path: "forum", Component: AdminForum },
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
            <p className="font-semibold">Не удалось открыть раздел «Препараты · дозы»</p>
            <p className="text-sm mt-2 text-amber-900/90">
              Обновите страницу. Если снова пусто — откройте консоль (F12 → Console) и проверьте, что в backend выполнены миграции Prisma (таблица DosageDrug) и перезапущен сервер.
            </p>
          </div>
        ),
      },
      { path: "push", Component: AdminPush },
      { path: "settings", Component: AdminSettings },
      { path: "vetcoins", Component: AdminVetCoins },
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
]);
