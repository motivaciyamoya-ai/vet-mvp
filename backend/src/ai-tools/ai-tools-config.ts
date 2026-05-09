import { ConfigService } from '@nestjs/config';

/** Ключи SiteSetting для переопределения env (префикс согласован с админкой). */
export const AI_SITE_KEYS = {
  provider: 'ai.provider',
  openaiApiKey: 'ai.openai.api_key',
  openaiModel: 'ai.openai.model',
  openaiBaseUrl: 'ai.openai.base_url',
  ollamaBaseUrl: 'ai.ollama.base_url',
  ollamaVisionModel: 'ai.ollama.vision_model',
  analyzerTemperature: 'ai.analyzer.temperature',
  analyzerMaxImages: 'ai.analyzer.max_images',
  medicalAnalyzerEnabled: 'ai.features.medical_analyzer_enabled',
  medicalAnalyzerAnamnesisEnabled: 'ai.features.medical_analyzer.anamnesis_enabled',
  medicalAnalyzerImagingEnabled: 'ai.features.medical_analyzer.imaging_enabled',
} as const;

export type ResolvedAiRuntime = {
  provider: 'openai' | 'ollama';
  openaiApiKey: string;
  openaiModel: string;
  /** База без хвостового /, по умолчанию https://api.openai.com/v1 */
  openaiBaseUrl: string;
  ollamaBaseUrl: string;
  ollamaVisionModel: string;
  temperature: number;
  maxImages: number;
  medicalAnalyzerEnabled: boolean;
  medicalAnalyzerAnamnesisEnabled: boolean;
  medicalAnalyzerImagingEnabled: boolean;
  /** Откуда взято значение провайдера: setting | env | default */
  providerSource: 'setting' | 'env' | 'default';
};

function pickSite(map: Record<string, string>, key: string): string | undefined {
  const v = map[key];
  const t = typeof v === 'string' ? v.trim() : '';
  return t.length > 0 ? t : undefined;
}

function truthySite(v: string | undefined, defaultEnv: boolean): { value: boolean; fromSetting: boolean } {
  if (v === undefined) return { value: defaultEnv, fromSetting: false };
  const s = v.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return { value: true, fromSetting: true };
  if (['0', 'false', 'no', 'off'].includes(s)) return { value: false, fromSetting: true };
  return { value: defaultEnv, fromSetting: true };
}

/**
 * Объединяет настройки из БД (SiteSetting с ключами ai.*) и переменные окружения.
 * Приоритет: непустое значение из БД над env.
 */
export function resolveAiRuntime(siteMap: Record<string, string>, config: ConfigService): ResolvedAiRuntime {
  const providerRaw = (
    pickSite(siteMap, AI_SITE_KEYS.provider) ??
    config.get<string>('AI_PROVIDER') ??
    'openai'
  )
    .trim()
    .toLowerCase();
  const provider: 'openai' | 'ollama' =
    providerRaw === 'ollama' ? 'ollama' : providerRaw === 'openai' ? 'openai' : 'openai';
  const providerSource = pickSite(siteMap, AI_SITE_KEYS.provider)
    ? ('setting' as const)
    : config.get<string>('AI_PROVIDER')?.trim()
      ? ('env' as const)
      : ('default' as const);

  const openaiApiKey =
    pickSite(siteMap, AI_SITE_KEYS.openaiApiKey) ?? config.get<string>('OPENAI_API_KEY')?.trim() ?? '';
  const openaiModel =
    pickSite(siteMap, AI_SITE_KEYS.openaiModel) ??
    config.get<string>('OPENAI_MODEL')?.trim() ??
    'gpt-4o-mini';
  const openaiBaseUrl =
    (
      pickSite(siteMap, AI_SITE_KEYS.openaiBaseUrl) ??
      config.get<string>('OPENAI_BASE_URL')?.trim() ??
      'https://api.openai.com/v1'
    ).replace(/\/+$/, '') || 'https://api.openai.com/v1';

  const ollamaBaseUrl =
    (
      pickSite(siteMap, AI_SITE_KEYS.ollamaBaseUrl) ??
      config.get<string>('OLLAMA_BASE_URL')?.trim() ??
      'http://ollama:11434'
    ).replace(/\/+$/, '') || 'http://ollama:11434';

  const ollamaVisionModel =
    pickSite(siteMap, AI_SITE_KEYS.ollamaVisionModel) ??
    config.get<string>('OLLAMA_VISION_MODEL')?.trim() ??
    'llava:7b';

  let temperature = 0.2;
  const tStr = pickSite(siteMap, AI_SITE_KEYS.analyzerTemperature);
  if (tStr !== undefined) {
    const n = Number(tStr.replace(',', '.'));
    if (Number.isFinite(n)) temperature = Math.max(0, Math.min(2, n));
  }

  let maxImages = 6;
  const mStr = pickSite(siteMap, AI_SITE_KEYS.analyzerMaxImages);
  if (mStr !== undefined) {
    const n = parseInt(mStr, 10);
    if (Number.isFinite(n)) maxImages = Math.max(1, Math.min(6, n));
  }

  const medFromEnv = config.get<string>('AI_MEDICAL_ANALYZER_ENABLED')?.trim().toLowerCase();
  const envEnabled = !(medFromEnv === '0' || medFromEnv === 'false' || medFromEnv === 'off');
  const { value: medicalAnalyzerEnabled } = truthySite(
    pickSite(siteMap, AI_SITE_KEYS.medicalAnalyzerEnabled),
    envEnabled,
  );

  // Детализация по режимам (по умолчанию наследуем общий флаг).
  const { value: medicalAnalyzerAnamnesisEnabled } = truthySite(
    pickSite(siteMap, AI_SITE_KEYS.medicalAnalyzerAnamnesisEnabled),
    medicalAnalyzerEnabled,
  );
  const { value: medicalAnalyzerImagingEnabled } = truthySite(
    pickSite(siteMap, AI_SITE_KEYS.medicalAnalyzerImagingEnabled),
    medicalAnalyzerEnabled,
  );

  return {
    provider,
    openaiApiKey,
    openaiModel,
    openaiBaseUrl,
    ollamaBaseUrl,
    ollamaVisionModel,
    temperature,
    maxImages,
    medicalAnalyzerEnabled,
    medicalAnalyzerAnamnesisEnabled,
    medicalAnalyzerImagingEnabled,
    providerSource,
  };
}

export function maskApiKey(key: string): { set: boolean; preview: string | null } {
  const k = key.trim();
  if (!k) return { set: false, preview: null };
  if (k.length <= 8) return { set: true, preview: '********' };
  return { set: true, preview: `${k.slice(0, 4)}…${k.slice(-4)}` };
}
