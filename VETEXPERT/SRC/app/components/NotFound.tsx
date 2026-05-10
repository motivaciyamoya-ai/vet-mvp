import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Страница не найдена — VetConnect";
    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, nofollow");
    meta.setAttribute("data-vc-notfound", "1");
    document.head.appendChild(meta);
    return () => {
      document.title = prevTitle;
      document.head.querySelector('meta[data-vc-notfound="1"]')?.remove();
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <AlertCircle className="w-16 h-16 text-gray-400 mb-4" aria-hidden />
      <h1 className="font-bold text-3xl mb-2">Страница не найдена</h1>
      <p className="text-gray-600 mb-6 max-w-md">
        К сожалению, запрашиваемая страница не существует.
      </p>
      {/* Явный <a href> для аудиторов/краулеров; без полной перезагрузки при работающем JS */}
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          navigate("/", { replace: true });
        }}
        className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium inline-block"
      >
        Вернуться на главную
      </a>
    </div>
  );
}
