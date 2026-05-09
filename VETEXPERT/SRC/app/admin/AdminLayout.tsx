import { useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  ShoppingBag,
  Flag,
  Siren,
  Globe,
  Bell,
  ArrowLeft,
  Shield,
  Settings2,
  Coins,
  Pill,
  CalendarDays,
  Wrench,
  Share2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
    isActive ? "bg-emerald-800 text-white" : "text-emerald-100 hover:bg-emerald-800/50"
  }`;

export default function AdminLayout() {
  const { user, isAuthenticated, authReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [authReady, isAuthenticated, navigate]);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Проверка сессии…</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Перенаправление на вход…</p>
      </div>
    );
  }

  if (!user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Загрузка профиля…</p>
      </div>
    );
  }

  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 text-slate-900">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <Shield className="w-14 h-14 mx-auto text-slate-400 mb-4" />
          <h1 className="text-xl font-bold">Админ-панель недоступна</h1>
          <p className="text-slate-600 mt-3">
            У аккаунта <span className="font-mono text-sm">{user.email}</span> роль{" "}
            <strong>{user.role}</strong>. Нужна роль <strong>ADMIN</strong>.
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Если вы считаете, что это ошибка — обратитесь к администратору сайта для выдачи прав доступа.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
            <Link
              to="/login"
              className="inline-flex justify-center px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
            >
              Войти другим пользователем
            </Link>
            <Link
              to="/"
              className="inline-flex justify-center px-4 py-2.5 rounded-lg border border-slate-300 font-medium hover:bg-slate-50"
            >
              На главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <aside className="w-56 shrink-0 bg-emerald-950 border-r border-emerald-900 flex flex-col h-svh lg:h-screen sticky top-0 overflow-hidden">
        <div className="p-4 border-b border-emerald-900">
          <p className="text-xs text-emerald-300 uppercase tracking-wide">VetConnect</p>
          <p className="font-semibold text-white">Админ-панель</p>
        </div>
        <nav className="p-2 flex-1 space-y-1 overflow-y-auto min-h-0 overscroll-contain">
          <NavLink to="/admin" end className={linkClass}>
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Обзор
          </NavLink>
          <NavLink to="/admin/users" className={linkClass}>
            <Users className="w-4 h-4 shrink-0" />
            Пользователи
          </NavLink>
          <NavLink to="/admin/forum" className={linkClass}>
            <MessageSquare className="w-4 h-4 shrink-0" />
            Форум
          </NavLink>
          <NavLink to="/admin/articles" className={linkClass}>
            <FileText className="w-4 h-4 shrink-0" />
            Статьи
          </NavLink>
          <NavLink to="/admin/events" className={linkClass}>
            <CalendarDays className="w-4 h-4 shrink-0" />
            Мероприятия
          </NavLink>
          <NavLink to="/admin/marketplace" className={linkClass}>
            <ShoppingBag className="w-4 h-4 shrink-0" />
            Маркетплейс
          </NavLink>
          <NavLink to="/admin/reports" className={linkClass}>
            <Flag className="w-4 h-4 shrink-0" />
            Жалобы
          </NavLink>
          <NavLink to="/admin/sos" className={linkClass}>
            <Siren className="w-4 h-4 shrink-0" />
            SOS
          </NavLink>
          <NavLink to="/admin/reference" className={linkClass}>
            <Globe className="w-4 h-4 shrink-0" />
            Справочники
          </NavLink>
          <NavLink to="/admin/dosage-drugs" className={linkClass}>
            <Pill className="w-4 h-4 shrink-0" />
            Препараты · дозы
          </NavLink>
          <NavLink to="/admin/ai-tools" className={linkClass}>
            <Sparkles className="w-4 h-4 shrink-0" />
            AI-инструменты
          </NavLink>
          <NavLink to="/admin/push" className={linkClass}>
            <Bell className="w-4 h-4 shrink-0" />
            Push-токены
          </NavLink>
          <NavLink to="/admin/vetcoins" className={linkClass}>
            <Coins className="w-4 h-4 shrink-0" />
            VetCoin
          </NavLink>
          <NavLink to="/admin/maintenance" className={linkClass}>
            <Wrench className="w-4 h-4 shrink-0" />
            Техработы
          </NavLink>
          <NavLink to="/admin/security" className={linkClass}>
            <Shield className="w-4 h-4 shrink-0" />
            Безопасность
          </NavLink>
          <NavLink to="/admin/seo" className={linkClass}>
            <Share2 className="w-4 h-4 shrink-0" />
            SEO
          </NavLink>
          <NavLink to="/admin/settings" className={linkClass}>
            <Settings2 className="w-4 h-4 shrink-0" />
            Настройки сайта
          </NavLink>
        </nav>
        <div className="p-2 border-t border-emerald-900">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-emerald-200 hover:bg-emerald-900"
          >
            <ArrowLeft className="w-4 h-4" />
            На сайт
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-slate-100 text-slate-900">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
