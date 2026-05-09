import { Link } from "react-router";

/** MyBB: Attachments — файлы в постах. У нас картинки тем и загрузки завязаны на свою систему. */
export default function AdminForumAttachments() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white text-sm font-semibold">
        Вложения (аналог MyBB)
      </div>
      <div className="p-5 space-y-3 text-sm text-slate-700 max-w-3xl">
        <p>
          В MyBB админка управляет типами файлов, квотами и удалением вложений из постов. В нашем форуме вложения к
          сообщениям устроены иначе (часть контента идёт через загрузку изображений к темам и Markdown/текст).
        </p>
        <p className="font-medium text-slate-900">Связанные действия:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Редактирование и удаление постов с текстом/ссылками на файлы — в{" "}
            <Link to="/admin/forum/threads" className="text-emerald-800 font-medium hover:underline">
              Темы и посты
            </Link>
            .
          </li>
          <li>
            Жалобы на контент —{" "}
            <Link to="/admin/forum/moderation" className="text-emerald-800 font-medium hover:underline">
              Очередь модерации
            </Link>{" "}
            и{" "}
            <Link to="/admin/reports" className="text-emerald-800 font-medium hover:underline">
              Жалобы
            </Link>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
