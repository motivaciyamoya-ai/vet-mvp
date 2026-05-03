import { AlertCircle } from "lucide-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <AlertCircle className="w-16 h-16 text-gray-400 mb-4" />
      <h1 className="font-bold text-3xl mb-2">Страница не найдена</h1>
      <p className="text-gray-600 mb-6">К сожалению, запрашиваемая страница не существует</p>
      <Link
        to="/"
        className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
      >
        Вернуться на главную
      </Link>
    </div>
  );
}
