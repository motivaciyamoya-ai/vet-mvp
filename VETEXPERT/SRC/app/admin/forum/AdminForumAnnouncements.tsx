import { Link } from "react-router";

/** Глобальные объявления в разделах — в текущей версии нет отдельной сущности в БД. */
export default function AdminForumAnnouncements() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white text-sm font-semibold">
        Объявления форума
      </div>
      <div className="p-5 space-y-3 text-sm text-slate-700 max-w-3xl">
        <p>
          Отдельного раздела объявлений (текст поверх списка тем в выбранных разделах) пока нет. Важные сообщения можно
          передать через закреплённые или «горячие» темы, либо через общесайтовые настройки.
        </p>
        <p className="font-medium text-slate-900">Что использовать сейчас</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Заметную тему в нужном разделе (заголовок и описание сами привлекают внимание).</li>
          <li>
            Раздел{" "}
            <Link to="/admin/settings" className="text-emerald-800 font-medium hover:underline">
              Настройки сайта
            </Link>
            — для параметров и текстов общего назначения.
          </li>
        </ul>
      </div>
    </div>
  );
}
