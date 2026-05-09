import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { User, Mail, Lock, Eye, EyeOff, MapPin, GraduationCap, Briefcase, Building2, Award, Globe, ChevronRight, ChevronLeft, Check, Loader, Cake } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

function toIsoLocalDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refCountries, setRefCountries] = useState<{ id: string; nameRu: string }[]>([]);
  const [refJobTitles, setRefJobTitles] = useState<{ id: string; nameRu: string }[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);
  const [refsError, setRefsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefsLoading(true);
      setRefsError("");
      try {
        const [countries, titles] = await Promise.all([
          apiFetch<{ id: string; nameRu: string }[]>("/api/reference/countries"),
          apiFetch<{ id: string; nameRu: string }[]>("/api/reference/job-titles"),
        ]);
        if (!cancelled) {
          setRefCountries(countries);
          setRefJobTitles(titles);
        }
      } catch {
        if (!cancelled) {
          setRefsError("Не удалось загрузить справочники. Проверьте подключение и попробуйте ещё раз.");
        }
      } finally {
        if (!cancelled) setRefsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Личные данные
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    countryId: "",
    city: "",
    birthDate: "",

    // Step 2: Образование
    education: "",
    degree: "",
    graduationYear: "",

    // Step 3: Профессиональная информация (должность выбирается из справочника)
    jobTitleId: "",
    direction: "",
    experience: "",

    // Step 4: Место работы
    workplace: "",
    position: "",
    workType: "",

    // Step 5: Дополнительно
    certifications: "",
    languages: [] as string[],
    bio: "",

    // Consent (обязательно для регистрации)
    policyAccepted: false,
  });

  const [showPassword, setShowPassword] = useState(false);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await register({
        email: formData.email.trim(),
        password: formData.password,
        displayName: `${formData.firstName} ${formData.lastName}`.trim(),
        city: formData.city,
        countryId: formData.countryId,
        jobTitleId: formData.jobTitleId,
        birthDate: formData.birthDate,
        policyAccepted: formData.policyAccepted,
      });
      if (result.ok) {
        const from = (location.state as { from?: string } | null)?.from;
        const safe = from?.startsWith("/") && !from.startsWith("//") ? from : null;
        navigate(safe ?? "/profile");
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка при регистрации");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return (
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.password &&
          formData.password === formData.confirmPassword &&
          formData.countryId &&
          formData.city &&
          formData.birthDate.trim().length >= 10
        );
      case 2:
        return formData.education && formData.degree && formData.graduationYear;
      case 3:
        return formData.jobTitleId && formData.direction && formData.experience;
      case 4:
        return formData.workplace && formData.position;
      case 5:
        return Boolean(formData.policyAccepted);
      default:
        return false;
    }
  };

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const degrees = ["Специалист", "Бакалавр", "Магистр", "Кандидат наук", "Доктор наук"];
  const workTypes = ["Полная занятость", "Частная практика", "Консультант", "Преподаватель"];

  const birthdayMaxIso = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 16);
    return toIsoLocalDateOnly(d);
  })();
  const birthdayMinIso = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 100);
    return toIsoLocalDateOnly(d);
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-emerald-600 rounded-2xl items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">V</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Регистрация в VetConnect</h1>
          <p className="text-gray-600">Присоединяйтесь к профессиональному сообществу</p>
        </div>

        {refsError && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900 text-left max-w-2xl mx-auto">
            {refsError}
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-4">
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Шаг {step} из {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <form className="space-y-6">
            {/* Step 1: Личные данные */}
            {step === 1 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold">Личные данные</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Имя <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField("firstName", e.target.value)}
                      placeholder="Анна"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Фамилия <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField("lastName", e.target.value)}
                      placeholder="Петрова"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      inputMode="email"
                      autoComplete="username"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="email@company.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Пароль <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => updateField("password", e.target.value)}
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

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Повторите пароль <span className="text-red-600">*</span>
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => updateField("confirmPassword", e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-600">Пароли не совпадают</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Страна <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={formData.countryId}
                        onChange={(e) => updateField("countryId", e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                        required
                        disabled={refsLoading || !!refsError}
                      >
                        <option value="">Выберите...</option>
                        {refCountries.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameRu}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Город <span className="text-red-600">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        placeholder="Москва"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Дата рождения <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => updateField("birthDate", e.target.value)}
                      min={birthdayMinIso}
                      max={birthdayMaxIso}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Обязательно для регистрации. На главной в этот день покажется поздравление.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Телефон
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+7 (900) 123-45-67"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </>
            )}

            {/* Step 2: Образование */}
            {step === 2 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold">Образование</h2>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Учебное заведение <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.education}
                    onChange={(e) => updateField("education", e.target.value)}
                    placeholder="МГАВМиБ им. К.И. Скрябина"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Степень <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formData.degree}
                      onChange={(e) => updateField("degree", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    >
                      <option value="">Выберите...</option>
                      {degrees.map((degree) => (
                        <option key={degree} value={degree}>
                          {degree}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Год окончания <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.graduationYear}
                      onChange={(e) => updateField("graduationYear", e.target.value)}
                      placeholder="2011"
                      min="1950"
                      max={new Date().getFullYear()}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Специализация */}
            {step === 3 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold">Специализация</h2>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Должность (как в профиле) <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.jobTitleId}
                    onChange={(e) => updateField("jobTitleId", e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                    disabled={refsLoading || !!refsError}
                  >
                    <option value="">Выберите...</option>
                    {refJobTitles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nameRu}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Направление работы <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.direction}
                    onChange={(e) => updateField("direction", e.target.value)}
                    placeholder="Хирургия мелких домашних животных"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Опыт работы (лет) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.experience}
                    onChange={(e) => updateField("experience", e.target.value)}
                    placeholder="5"
                    min="0"
                    max="60"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </>
            )}

            {/* Step 4: Место работы */}
            {step === 4 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold">Место работы</h2>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Организация <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.workplace}
                    onChange={(e) => updateField("workplace", e.target.value)}
                    placeholder="Ветеринарная клиника ВетПро"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Должность <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => updateField("position", e.target.value)}
                      placeholder="Главный ветеринарный врач"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Тип занятости
                    </label>
                    <select
                      value={formData.workType}
                      onChange={(e) => updateField("workType", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Выберите...</option>
                      {workTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Step 5: Дополнительно */}
            {step === 5 && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold">Дополнительная информация</h2>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Сертификаты и курсы
                  </label>
                  <textarea
                    value={formData.certifications}
                    onChange={(e) => updateField("certifications", e.target.value)}
                    placeholder="Укажите ваши сертификаты, курсы повышения квалификации..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    О себе
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => updateField("bio", e.target.value)}
                    placeholder="Расскажите немного о себе, своих интересах в ветеринарии..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[120px]"
                  />
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-800">
                      <p className="font-semibold mb-1">Вы почти закончили!</p>
                      <p>
                        После регистрации доступен вход в личный кабинет. На указанную почту уходит письмо со ссылкой
                        для подтверждения (если на сервере настроен SMTP; иначе ссылка только в логе backend). Бонус за
                        регистрацию начисляет сервер через VetCoin из настроек админки.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.policyAccepted}
                      onChange={(e) => updateField("policyAccepted", e.target.checked)}
                      className="mt-1 h-4 w-4 accent-emerald-600"
                    />
                    <span className="text-sm text-slate-800">
                      Я ознакомлен(а) и согласен(на) с{" "}
                      <Link to="/privacy" className="text-emerald-700 font-semibold hover:underline">
                        политикой конфиденциальности
                      </Link>{" "}
                      и{" "}
                      <Link to="/cookies" className="text-emerald-700 font-semibold hover:underline">
                        политикой cookies
                      </Link>
                      .
                      <span className="block text-xs text-slate-500 mt-1">
                        Без согласия регистрация невозможна.
                      </span>
                    </span>
                  </label>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}
          </form>

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Далее
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Регистрация...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Завершить регистрацию
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Login Link */}
        <div className="text-center text-sm text-gray-600">
          Уже есть аккаунт?{" "}
          <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
