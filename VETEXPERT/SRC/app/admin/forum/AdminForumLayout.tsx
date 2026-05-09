import { NavLink, Outlet } from "react-router";

const subLink =
  ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center px-3 py-2 text-sm font-medium border border-b-0 rounded-t-md -mb-px transition-colors ${
    isActive
      ? "bg-white text-slate-900 border-slate-300 border-b-white z-[1]"
      : "bg-slate-200/90 text-slate-700 border-transparent hover:bg-slate-200 hover:text-slate-900"
  }`;

export default function AdminForumLayout() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Раздел админ-панели</p>
        <h1 className="text-2xl font-bold text-slate-900">Форумы и сообщения</h1>
        <p className="text-slate-600 text-sm mt-1 max-w-3xl">
          Управление разделами, темами и постами; объявления на весь форум; очередь жалоб по темам и постам; список загруженных
          иллюстраций.
        </p>
      </div>

      <div className="border-b border-slate-300 bg-slate-100/80 rounded-t-lg px-2 pt-2">
        <nav className="flex flex-wrap gap-0.5" aria-label="Подменю форума">
          <NavLink to="/admin/forum/management" className={subLink} end>
            Управление форумами
          </NavLink>
          <NavLink to="/admin/forum/threads" className={subLink}>
            Темы и посты
          </NavLink>
          <NavLink to="/admin/forum/announcements" className={subLink}>
            Объявления
          </NavLink>
          <NavLink to="/admin/forum/moderation" className={subLink}>
            Очередь модерации
          </NavLink>
          <NavLink to="/admin/forum/attachments" className={subLink}>
            Вложения
          </NavLink>
        </nav>
      </div>

      <Outlet />
    </div>
  );
}
