import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Effective = {
  provider: string;
  openaiModel: string;
  openaiBaseUrl: string;
  ollamaBaseUrl: string;
  ollamaVisionModel: string;
  analyzerTemperature: number;
  analyzerMaxImages: number;
  medicalAnalyzerEnabled: boolean;
  medicalAnalyzerAnamnesisEnabled: boolean;
  medicalAnalyzerImagingEnabled: boolean;
};

type ConfigResponse = {
  effective: Effective;
  openaiApiKeyMasked: string | null;
  openaiApiKeyConfigured: boolean;
  hints: {
    providerSource: string;
    envFallback: {
      hasOpenAiKeyEnv: boolean;
      hasAiProviderEnv: boolean;
    };
  };
  storedKeys: string[];
};

export default function AdminAiTools() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [data, setData] = useState<ConfigResponse | null>(null);

  const [provider, setProvider] = useState<"openai" | "ollama">("openai");
  const [openaiModel, setOpenaiModel] = useState("");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("");
  const [ollamaVisionModel, setOllamaVisionModel] = useState("");
  const [analyzerTemperature, setAnalyzerTemperature] = useState(0.2);
  const [analyzerMaxImages, setAnalyzerMaxImages] = useState(6);
  const [medicalAnalyzerEnabled, setMedicalAnalyzerEnabled] = useState(true);
  const [medicalAnalyzerAnamnesisEnabled, setMedicalAnalyzerAnamnesisEnabled] = useState(true);
  const [medicalAnalyzerImagingEnabled, setMedicalAnalyzerImagingEnabled] = useState(true);
  const [changeOpenaiKey, setChangeOpenaiKey] = useState(false);
  const [openaiApiKeyDraft, setOpenaiApiKeyDraft] = useState("");

  const applyFromServer = useCallback((c: ConfigResponse) => {
    setData(c);
    const e = c.effective;
    setProvider(e.provider === "ollama" ? "ollama" : "openai");
    setOpenaiModel(e.openaiModel);
    setOpenaiBaseUrl(e.openaiBaseUrl);
    setOllamaBaseUrl(e.ollamaBaseUrl);
    setOllamaVisionModel(e.ollamaVisionModel);
    setAnalyzerTemperature(e.analyzerTemperature);
    setAnalyzerMaxImages(e.analyzerMaxImages);
    setMedicalAnalyzerEnabled(e.medicalAnalyzerEnabled);
    setMedicalAnalyzerAnamnesisEnabled(e.medicalAnalyzerAnamnesisEnabled);
    setMedicalAnalyzerImagingEnabled(e.medicalAnalyzerImagingEnabled);
    setChangeOpenaiKey(false);
    setOpenaiApiKeyDraft("");
  }, []);

  const load = useCallback(async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const c = await apiFetch<ConfigResponse>("/api/admin/ai-tools/config");
      applyFromServer(c);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [applyFromServer]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      const json: Record<string, unknown> = {
        provider,
        openaiModel: openaiModel.trim(),
        openaiBaseUrl: openaiBaseUrl.trim(),
        ollamaBaseUrl: ollamaBaseUrl.trim(),
        ollamaVisionModel: ollamaVisionModel.trim(),
        analyzerTemperature,
        analyzerMaxImages: Math.round(analyzerMaxImages),
        medicalAnalyzerEnabled,
        medicalAnalyzerAnamnesisEnabled,
        medicalAnalyzerImagingEnabled,
      };
      if (changeOpenaiKey) {
        json.openaiApiKey = openaiApiKeyDraft.trim();
      }
      const c = await apiFetch<ConfigResponse>("/api/admin/ai-tools/config", {
        method: "PUT",
        json,
      });
      applyFromServer(c);
      setOk("Настройки AI сохранены.");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI-инструменты</h1>
        <p className="text-slate-600 text-sm mt-1">
          Параметры для медицинского анализатора (анамнез и снимки). Значения в базе имеют приоритет над
          переменными окружения (см. <code className="bg-slate-100 px-1 rounded">backend/.env.example</code>).
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <p className="font-semibold text-slate-900">Быстрый старт (для новичка)</p>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
          <li>
            Выберите <strong>провайдера</strong>: <strong>Ollama</strong> (бесплатно, на вашем сервере) или{" "}
            <strong>OpenAI</strong> (платно, по API‑ключу).
          </li>
          <li>
            Заполните блок провайдера ниже (минимально обязательные поля подсвечены примерами).
          </li>
          <li>
            Нажмите <strong>Сохранить</strong>, затем откройте пользовательский AI‑анализ и сделайте тестовый запрос.
          </li>
        </ol>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Важно</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>
              Включение ниже — это доступ пользователей к{" "}
              <code className="bg-white px-1 rounded">POST /api/ai/medical-analyzer</code>.
            </li>
            <li>
              Ключи API лучше хранить в env. Этот экран позволяет хранить их в базе (SiteSetting) — делайте так только
              если вам это удобно и вы доверяете админ‑доступу.
            </li>
          </ul>
        </div>
      </section>

      {err ? <p className="text-red-600 text-sm">{err}</p> : null}
      {ok ? <p className="text-emerald-700 text-sm">{ok}</p> : null}

      {loading ? (
        <p className="text-slate-600 text-sm">Загрузка…</p>
      ) : (
        <>
          {data ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800 space-y-2">
              <p className="font-semibold text-slate-900">Текущая эффективная конфигурация</p>
              <p>
                Провайдер: <span className="font-mono">{data.effective.provider}</span>{" "}
                <span className="text-slate-500">(источник: {data.hints.providerSource})</span>
              </p>
              <p>
                Ключ OpenAI в БД:{" "}
                {data.openaiApiKeyConfigured
                  ? `да · ${data.openaiApiKeyMasked ?? "********"}`
                  : "нет (используется env или не задан)"}
              </p>
              <p className="text-slate-600">
                Env: OPENAI_API_KEY {data.hints.envFallback.hasOpenAiKeyEnv ? "задан" : "не задан"}, AI_PROVIDER{" "}
                {data.hints.envFallback.hasAiProviderEnv ? "задан" : "не задан"}
              </p>
              <p className="text-xs text-slate-500">
                Если значение «не меняется», значит оно берётся из env или уже сохранено в базе. Этот блок показывает
                именно то, чем будет пользоваться API прямо сейчас.
              </p>
              {data.storedKeys.length ? (
                <p className="text-xs text-slate-500">
                  Ключи в SiteSetting: {data.storedKeys.join(", ")}
                </p>
              ) : (
                <p className="text-xs text-slate-500">В БД пока нет переопределений ai.*</p>
              )}
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={medicalAnalyzerEnabled}
                onChange={(e) => setMedicalAnalyzerEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-semibold text-slate-900">
                Разрешить пользователям эндпоинт «медицинский анализатор»
              </span>
            </label>
            <p className="text-xs text-slate-500 -mt-3 ml-7">
              При выключении запросы к <code className="bg-slate-100 px-1 rounded">POST /api/ai/medical-analyzer</code>{" "}
              получают 403. Флаг также можно задать через{" "}
              <code className="bg-slate-100 px-1 rounded">AI_MEDICAL_ANALYZER_ENABLED</code>.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="font-semibold text-slate-900 text-sm">Отдельные режимы</p>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={medicalAnalyzerAnamnesisEnabled}
                  onChange={(e) => setMedicalAnalyzerAnamnesisEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-800">
                  <strong>Анамнез</strong> — текст + (опционально) вложения.
                  <span className="block text-xs text-slate-600 mt-1">
                    Подходит для описания симптомов/истории болезни. Если выключить — анализ анамнеза будет запрещён,
                    но снимки могут оставаться включёнными.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={medicalAnalyzerImagingEnabled}
                  onChange={(e) => setMedicalAnalyzerImagingEnabled(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-800">
                  <strong>УЗИ/Рентген</strong> — анализ изображений.
                  <span className="block text-xs text-slate-600 mt-1">
                    Используется, когда врач прикладывает снимки. Если выключить — режим снимков будет запрещён.
                  </span>
                </span>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900 text-sm">Какие файлы поддерживаются</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-slate-700">
                <li>
                  <strong>Изображения</strong>: JPG/JPEG, PNG, WebP, GIF
                </li>
                <li>
                  <strong>PDF</strong>: принимается как вложение, но для анализа снимков лучше конвертировать страницы в PNG/JPG
                </li>
                <li>
                  <strong>DICOM</strong>: сейчас не анализируется напрямую — конвертируйте в PNG/JPG
                </li>
              </ul>
              <p className="text-xs text-slate-600 mt-2">
                Ограничения: до <strong>6</strong> файлов за запрос, каждый до <strong>12 MB</strong> (серверный лимит).
              </p>
            </div>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-800">Провайдер</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as "openai" | "ollama")}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              >
                <option value="openai">OpenAI (или совместимый API)</option>
                <option value="ollama">Ollama (локально / в Docker)</option>
              </select>
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">Что выбрать?</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Ollama</strong>: проще всего для старта, без ключей. Нужна vision‑модель (например{" "}
                  <code className="bg-white px-1 rounded">llava:7b</code>) и ресурсы сервера (CPU/RAM, лучше GPU).
                </li>
                <li>
                  <strong>OpenAI</strong>: лучше качество, но нужен ключ и списания по API. Подходит, если не хотите
                  держать модели у себя.
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-4">
              <p className="text-sm font-semibold text-emerald-950">OpenAI</p>
              <div className="text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">Как заполнить</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>API key</strong>: ключ вида <code className="bg-white px-1 rounded">sk-…</code>. Можно хранить
                    в env (<code className="bg-white px-1 rounded">OPENAI_API_KEY</code>) или в базе через чекбокс ниже.
                  </li>
                  <li>
                    <strong>Модель</strong>: например <code className="bg-white px-1 rounded">gpt-4o-mini</code>. Если не
                    уверены — оставьте так.
                  </li>
                  <li>
                    <strong>Базовый URL</strong>: обычно <code className="bg-white px-1 rounded">https://api.openai.com/v1</code>.
                    Нужен только если используете прокси/совместимый API.
                  </li>
                </ul>
              </div>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={changeOpenaiKey}
                  onChange={(e) => {
                    setChangeOpenaiKey(e.target.checked);
                    if (!e.target.checked) setOpenaiApiKeyDraft("");
                  }}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span className="text-sm text-slate-800">
                  Изменить API-ключ в базе (если не отмечено — ключ не трогаем). Пустое поле при сохранении{" "}
                  <strong>удалит</strong> ключ из БД и будет использоваться только{" "}
                  <code className="text-xs bg-white px-1 rounded">OPENAI_API_KEY</code> из окружения.
                </span>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">OpenAI API key</span>
                <input
                  type="password"
                  autoComplete="off"
                  disabled={!changeOpenaiKey}
                  value={openaiApiKeyDraft}
                  onChange={(e) => setOpenaiApiKeyDraft(e.target.value)}
                  placeholder={changeOpenaiKey ? "sk-..." : "— не менять —"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                />
                <p className="text-xs text-slate-600">
                  Совет: если ключ хранится в env, оставьте чекбокс выключенным — так ключ никогда не попадёт в базу.
                </p>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Модель</span>
                <input
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-600">
                  Если модель не поддерживает vision/изображения — анализ снимков будет падать. Для анамнеза (текст)
                  достаточно обычной chat‑модели.
                </p>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Базовый URL API</span>
                <input
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-600">
                  Пример: <code className="bg-white px-1 rounded">https://api.openai.com/v1</code>. Слэш в конце не нужен.
                </p>
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <p className="text-sm font-semibold text-slate-900">Ollama (vision)</p>
              <div className="text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-slate-900">Как заполнить</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Базовый URL</strong>: если Ollama в Docker Compose этого проекта —{" "}
                    <code className="bg-white px-1 rounded">http://ollama:11434</code>.
                  </li>
                  <li>
                    <strong>Vision‑модель</strong>: имя модели в Ollama, например{" "}
                    <code className="bg-white px-1 rounded">llava:7b</code>.
                  </li>
                  <li>
                    После выбора модели её нужно один раз скачать на сервер:{" "}
                    <code className="bg-white px-1 rounded">docker exec -it vet-mvp-ollama-1 ollama pull llava:7b</code>.
                  </li>
                </ul>
              </div>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Базовый URL</span>
                <input
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  placeholder="http://ollama:11434"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-600">
                  Важно: <code className="bg-white px-1 rounded">localhost</code> внутри Docker‑контейнера — это сам контейнер,
                  а не хост. Поэтому для Compose используйте имя сервиса <code className="bg-white px-1 rounded">ollama</code>.
                </p>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Vision-модель</span>
                <input
                  value={ollamaVisionModel}
                  onChange={(e) => setOllamaVisionModel(e.target.value)}
                  placeholder="llava:7b"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-600">
                  Если указать модель, которой нет в Ollama, API вернёт ошибку. Скачайте модель командой выше.
                </p>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Температура (0–2)</span>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={analyzerTemperature}
                  onChange={(e) => setAnalyzerTemperature(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-600">
                  Чем ниже — тем стабильнее и «суше» ответы. Рекомендуем: <strong>0.2–0.4</strong>.
                </p>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Максимум изображений за запрос (1–6)</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  step={1}
                  value={analyzerMaxImages}
                  onChange={(e) => setAnalyzerMaxImages(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-xs text-slate-600">
                  Больше изображений — дороже/медленнее и выше риск таймаутов. Обычно хватает <strong>3–6</strong>.
                </p>
              </label>
            </div>

            <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                Частые проблемы и как их решить
              </summary>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>
                  <strong>403 при запросе анализа</strong> — выключен флаг «Разрешить…» или{" "}
                  <code className="bg-white px-1 rounded">AI_MEDICAL_ANALYZER_ENABLED=false</code>.
                </p>
                <p>
                  <strong>OpenAI: “не настроен ключ”</strong> — не задан{" "}
                  <code className="bg-white px-1 rounded">OPENAI_API_KEY</code> и вы не сохранили ключ в базе.
                </p>
                <p>
                  <strong>Ollama: connection refused / 404</strong> — неверный URL или контейнер Ollama не запущен.
                  Для Compose используйте <code className="bg-white px-1 rounded">http://ollama:11434</code>.
                </p>
                <p>
                  <strong>Ollama: model not found</strong> — скачайте модель:{" "}
                  <code className="bg-white px-1 rounded">docker exec -it vet-mvp-ollama-1 ollama pull llava:7b</code>.
                </p>
                <p>
                  <strong>Долго/таймаут</strong> — уменьшите «Максимум изображений» и/или используйте более лёгкую модель.
                </p>
              </div>
            </details>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => void save()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void load()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Обновить
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
