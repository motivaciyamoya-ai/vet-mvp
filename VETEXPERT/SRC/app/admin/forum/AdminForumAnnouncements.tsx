import { Link } from "react-router";

/** MyBB: Forum Announcements — глобальные объявления в разделах. В портале отдельной сущности нет. */
export default function AdminForumAnnouncements() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white text-sm font-semibold">
        Объявления форума (аналог MyBB)
      </div>
      <div className="p-5 space-y-3 text-sm text-slate-700 max-w-3xl">
        <p>
          В MyBB здесь создаются <strong>объявления</strong>, которые показываются в выбранных форумах. В VetConnect такой
          таблицы пока нет.
        </p>
        <p className="font-medium text-slate-900">Что можно сделать сейчас:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Закрепить важную тему вручную (если на сайте есть закрепление / «горячие» темы — используйте их вместо
            объявления).
          </li>
          <li>
            Текст на всю площадку — раздел{" "}
            <Link to="/admin/settings" className="text-emerald-800 font-medium hover:underline">
              Настройки сайта
            </Link>{" "}
            или баннеры на главной (если появятся в продукте).
          </li>
        </ul>
        <p className="text-xs text-slate-500 pt-2">
          Если нужна полноценная функция как в MyBB — потребуется модель в БД (объявление, форумы, даты) и вывод в UI.
        </p>
      </div>
    </div>
  );
}
