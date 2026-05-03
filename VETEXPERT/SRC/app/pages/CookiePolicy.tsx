import { Link } from "react-router";

export default function CookiePolicy() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Политика использования cookies</h1>
        <Link to="/" className="text-sm font-semibold text-emerald-700 hover:underline">
          На главную
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 space-y-5 text-sm leading-relaxed text-slate-800">
        <p className="text-slate-600 text-xs">
          Версия: 1.0 • Дата публикации: {new Date().toLocaleDateString("ru-RU")}
        </p>

        <p>
          Cookies — это небольшие файлы, которые сохраняются на устройстве пользователя и помогают Сервису работать
          корректно. Мы также можем использовать localStorage для хранения некоторых технических параметров (например,
          согласия на cookies).
        </p>

        <div className="space-y-2">
          <h2 className="text-base font-bold">1. Какие cookies мы используем</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-semibold">Обязательные</span>: необходимы для входа, безопасности и базовой работы
              сайта.
            </li>
            <li>
              <span className="font-semibold">Функциональные</span>: запоминают настройки интерфейса (язык и т.п.).
            </li>
            <li>
              <span className="font-semibold">Аналитические</span> (если подключены): помогают понять, как используется
              Сервис, чтобы улучшать его.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold">2. Управление cookies</h2>
          <p>
            Вы можете принять или отклонить необязательные cookies в баннере. Также вы можете ограничить или удалить
            cookies в настройках браузера. Учтите: отключение обязательных cookies может привести к некорректной работе
            Сервиса.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-base font-bold">3. Связанные документы</h2>
          <p>
            Обработка персональных данных описана в{" "}
            <Link to="/privacy" className="text-emerald-700 font-semibold hover:underline">
              Политике конфиденциальности
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

