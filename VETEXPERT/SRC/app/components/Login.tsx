import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, LogIn, Loader } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.ok) {
        const from = (location.state as { from?: string } | null)?.from;
        const safe = from?.startsWith("/") && !from.startsWith("//") ? from : null;
        navigate(safe ?? "/");
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-emerald-600 rounded-2xl items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">V</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">VetConnect</h1>
          <p className="text-gray-600">Войдите в свой аккаунт</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@company.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-gray-600">Запомнить меня</span>
              </label>
              <Link to="/forgot-password" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Забыли пароль?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Вход...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Войти
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center space-y-3">
            <p className="text-gray-600 text-sm">
              Нет аккаунта?{" "}
              <Link to="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Зарегистрироваться
              </Link>
            </p>
            {!import.meta.env.DEV ? (
              <p className="text-gray-500 text-xs leading-relaxed">
                При проблемах со входом проверьте email/пароль и повторите попытку через несколько минут. Если письма с
                подтверждением не приходят — загляньте в папку «Спам» или запросите письмо повторно в профиле.
              </p>
            ) : (
              <>
                <p className="text-gray-500 text-xs leading-relaxed">
                  <span className="font-semibold">DEV:</span> демо-вход может быть доступен локально после{" "}
                  <span className="font-mono">npm run seed</span> на API. Пример:{" "}
                  <span className="font-mono">vet@vetmvp.local</span> /{" "}
                  <span className="font-mono font-semibold">Demo123!</span>
                </p>
                <details className="text-left text-xs text-gray-600 border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <summary className="cursor-pointer font-semibold text-gray-700">Не входит? Локальная проверка</summary>
                  <ol className="mt-2 list-decimal pl-5 space-y-2">
                    <li>
                      API запущено: каталог проекта backend →{" "}
                      <code className="bg-white px-1 rounded">npm run start:dev</code>.
                    </li>
                    <li>
                      Откройте{" "}
                      <a href="http://localhost:3000/api/docs" className="text-emerald-700 underline" target="_blank" rel="noreferrer">
                        http://localhost:3000/api/docs
                      </a>{" "}
                      — если документация не открывается, авторизация с фронта тоже не заработает.
                    </li>
                    <li>
                      Dev-сервер фронта проксирует <code className="bg-white px-1 rounded">/api</code> на{" "}
                      <code className="bg-white px-1 rounded">http://localhost:3000</code>. Для особых схем установите{" "}
                      <code className="bg-white px-1 rounded">VITE_API_BASE_URL</code>.
                    </li>
                  </ol>
                </details>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
