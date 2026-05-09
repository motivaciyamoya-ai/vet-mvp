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

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-4">
              <p className="text-sm font-semibold text-emerald-950">OpenAI</p>
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
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Модель</span>
                <input
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Базовый URL API</span>
                <input
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <p className="text-sm font-semibold text-slate-900">Ollama (vision)</p>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Базовый URL</span>
                <input
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  placeholder="http://ollama:11434"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-800">Vision-модель</span>
                <input
                  value={ollamaVisionModel}
                  onChange={(e) => setOllamaVisionModel(e.target.value)}
                  placeholder="llava:7b"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                />
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
              </label>
            </div>

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
