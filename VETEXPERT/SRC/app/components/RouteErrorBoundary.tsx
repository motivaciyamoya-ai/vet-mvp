import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router";
import { AlertTriangle } from "lucide-react";

/**
 * Глобальная граница ошибок маршрутизатора: корректный H1 (SEO/а11и),
 * без дефолтных «Unexpected Application Error» / H2 без H1.
 */
export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let userMessage = "Не удалось открыть страницу. Попробуйте обновить вкладку или вернуться на главную.";
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      userMessage = "Страница не найдена.";
    } else if (error.status >= 500) {
      userMessage = "Сервис временно недоступен. Попробуйте позже.";
    }
  } else if (error instanceof Error && import.meta.env.DEV) {
    userMessage = error.message;
  }

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-12 text-center bg-slate-50">
      <AlertTriangle className="h-14 w-14 text-amber-500 mb-4 shrink-0" aria-hidden />
      <h1 className="text-2xl font-bold text-slate-900 mb-3">Ошибка загрузки</h1>
      <p className="text-slate-600 max-w-md mb-8 leading-relaxed">{userMessage}</p>
      <a
        href="/"
        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        onClick={(e) => {
          e.preventDefault();
          navigate("/", { replace: true });
        }}
      >
        На главную
      </a>
    </div>
  );
}
