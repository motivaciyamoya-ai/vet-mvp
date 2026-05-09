import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ResolvedAiRuntime, resolveAiRuntime } from './ai-tools-config';

type MulterMemFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type AnalyzerUrgency = 'low' | 'medium' | 'high';

export type MedicalAnalyzerResult = {
  kind: 'anamnesis' | 'imaging';
  confidence: number; // 0..100
  urgency: AnalyzerUrgency;
  diagnosis: string[];
  recommendations: string[];
  additionalTests: string[];
  notesForDoctor: string[];
  disclaimer: string;
};

function clamp01to100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function asDataUrl(file: MulterMemFile): string {
  const mt = file.mimetype || 'application/octet-stream';
  const b64 = file.buffer.toString('base64');
  return `data:${mt};base64,${b64}`;
}

function safeTrimList(xs: unknown, max = 14): string[] {
  if (!Array.isArray(xs)) return [];
  const out: string[] = [];
  for (const v of xs) {
    if (typeof v !== 'string') continue;
    const t = v.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeUrgency(v: unknown): AnalyzerUrgency {
  const t = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (t === 'high' || t === 'medium' || t === 'low') return t;
  return 'medium';
}

@Injectable()
export class AiToolsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /** Текущая конфигурация (БД поверх env). */
  async resolvedRuntime(): Promise<ResolvedAiRuntime> {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { startsWith: 'ai.' } },
    });
    const site: Record<string, string> = {};
    for (const r of rows) {
      site[r.key] = r.value;
    }
    return resolveAiRuntime(site, this.config);
  }

  async assertMedicalAnalyzerEnabled(): Promise<void> {
    const r = await this.resolvedRuntime();
    if (!r.medicalAnalyzerEnabled) {
      throw new ForbiddenException(
        'Медицинский AI-анализатор отключён администратором. Включите его в админ-панели: AI-инструменты.',
      );
    }
  }

  async analyzeAnamnesis(input: { userId: string; anamnesisText: string; files: MulterMemFile[] }): Promise<MedicalAnalyzerResult> {
    const r = await this.resolvedRuntime();
    if (r.provider !== 'openai' && r.provider !== 'ollama') {
      throw new NotImplementedException('Провайдер AI должен быть openai или ollama');
    }

    const images = input.files
      .filter((f) => /^image\//i.test(f.mimetype))
      .slice(0, r.maxImages)
      .map((f) => ({ name: f.originalname, dataUrl: asDataUrl(f) }));

    const prompt = buildPrompt({
      kind: 'anamnesis',
      anamnesisText: input.anamnesisText,
      notes: '',
      imagesCount: images.length,
    });

    const res =
      r.provider === 'openai'
        ? await callOpenAiVisionJson({
            apiKey: r.openaiApiKey,
            openaiBaseUrl: r.openaiBaseUrl,
            model: r.openaiModel,
            temperature: r.temperature,
            prompt,
            images: images.map((x) => x.dataUrl),
          })
        : await callOllamaVisionJson({
            baseUrl: r.ollamaBaseUrl,
            model: r.ollamaVisionModel,
            temperature: r.temperature,
            prompt,
            images: images.map((x) => x.dataUrl),
          });

    return normalizeResult('anamnesis', res);
  }

  async analyzeImaging(input: { userId: string; notes: string; files: MulterMemFile[] }): Promise<MedicalAnalyzerResult> {
    const r = await this.resolvedRuntime();
    if (r.provider !== 'openai' && r.provider !== 'ollama') {
      throw new NotImplementedException('Провайдер AI должен быть openai или ollama');
    }

    const images = input.files
      .filter((f) => /^image\//i.test(f.mimetype))
      .slice(0, r.maxImages)
      .map((f) => ({ name: f.originalname, dataUrl: asDataUrl(f) }));

    if (images.length === 0) {
      throw new BadRequestException('Пока поддерживаются только изображения (JPG/PNG/WebP/GIF). DICOM/PDF нужно конвертировать в PNG.');
    }

    const prompt = buildPrompt({
      kind: 'imaging',
      anamnesisText: '',
      notes: input.notes,
      imagesCount: images.length,
    });

    const res =
      r.provider === 'openai'
        ? await callOpenAiVisionJson({
            apiKey: r.openaiApiKey,
            openaiBaseUrl: r.openaiBaseUrl,
            model: r.openaiModel,
            temperature: r.temperature,
            prompt,
            images: images.map((x) => x.dataUrl),
          })
        : await callOllamaVisionJson({
            baseUrl: r.ollamaBaseUrl,
            model: r.ollamaVisionModel,
            temperature: r.temperature,
            prompt,
            images: images.map((x) => x.dataUrl),
          });

    return normalizeResult('imaging', res);
  }
}

function buildPrompt(input: {
  kind: 'anamnesis' | 'imaging';
  anamnesisText: string;
  notes: string;
  imagesCount: number;
}): string {
  const base = [
    'Ты — ветеринарный ассистент по диагностике. Это НЕ финальный диагноз, а поддержка врача.',
    'Отвечай строго валидным JSON без markdown и без текста вокруг.',
    'Язык: русский.',
    'Структура JSON:',
    '{',
    '  "confidence": number (0..100),',
    '  "urgency": "low"|"medium"|"high",',
    '  "diagnosis": string[] (гипотезы с вероятностями/обоснованием кратко),',
    '  "recommendations": string[] (что сделать сейчас),',
    '  "additionalTests": string[] (что проверить дальше),',
    '  "notesForDoctor": string[] (ограничения, дифдиагнозы, что важно уточнить),',
    '}',
    '',
    'Требования безопасности:',
    '- если данных недостаточно — так и скажи в diagnosis/notesForDoctor и снизь confidence.',
    '- если видишь красные флаги — urgency="high" и рекомендации: неотложные действия.',
    '',
  ].join('\n');

  if (input.kind === 'anamnesis') {
    return (
      base +
      [
        'Вход: анамнез (текст + возможно фото/сканы).',
        `Фото/сканов: ${input.imagesCount}.`,
        'Текст анамнеза:',
        input.anamnesisText ? input.anamnesisText : '(текст не предоставлен, см. файлы)',
      ].join('\n')
    );
  }

  return (
    base +
    [
      'Вход: снимки УЗИ/рентген (изображения) + опциональные заметки.',
      `Снимков: ${input.imagesCount}.`,
      'Заметки врача:',
      input.notes ? input.notes : '(нет)',
    ].join('\n')
  );
}

async function callOpenAiVisionJson(opts: {
  apiKey: string;
  openaiBaseUrl: string;
  model: string;
  temperature: number;
  prompt: string;
  images: string[];
}): Promise<any> {
  if (!opts.apiKey?.trim()) {
    throw new BadRequestException(
      'AI (OpenAI) не настроен: задайте ключ в админ-панели (AI-инструменты) или переменную окружения OPENAI_API_KEY.',
    );
  }

  const base = opts.openaiBaseUrl.replace(/\/+$/, '') || 'https://api.openai.com/v1';
  const url = `${base}/chat/completions`;

  const content: any[] = [{ type: 'text', text: opts.prompt }];
  for (const dataUrl of opts.images.slice(0, 6)) {
    content.push({ type: 'image_url', image_url: { url: dataUrl } });
  }

  const body = {
    model: opts.model.trim() || 'gpt-4o-mini',
    temperature: opts.temperature,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new BadRequestException(`AI ошибка: HTTP ${res.status} ${text.slice(0, 500)}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BadRequestException('AI вернул не-JSON ответ.');
  }
  const contentText = parsed?.choices?.[0]?.message?.content;
  if (typeof contentText !== 'string' || !contentText.trim()) {
    throw new BadRequestException('AI не вернул результат.');
  }
  try {
    return JSON.parse(contentText);
  } catch {
    throw new BadRequestException('AI вернул невалидный JSON результата.');
  }
}

async function callOllamaVisionJson(opts: {
  baseUrl: string;
  model: string;
  temperature: number;
  prompt: string;
  images: string[];
}) {
  const base = opts.baseUrl.replace(/\/+$/, '');
  const imgs = opts.images.slice(0, 6).map((d) => {
    const m = /^data:([^;]+);base64,(.*)$/i.exec(d);
    return m ? m[2] : d;
  });

  const body = {
    model: opts.model || 'llava:7b',
    stream: false,
    format: 'json',
    options: { temperature: opts.temperature },
    messages: [
      {
        role: 'user',
        content: opts.prompt,
        images: imgs,
      },
    ],
  };

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new BadRequestException(`AI (ollama) ошибка: HTTP ${res.status} ${text.slice(0, 500)}`);
  }
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BadRequestException('AI (ollama) вернул не-JSON ответ.');
  }
  const contentText = parsed?.message?.content;
  if (typeof contentText !== 'string' || !contentText.trim()) {
    throw new BadRequestException('AI (ollama) не вернул результат.');
  }
  try {
    return JSON.parse(contentText);
  } catch {
    throw new BadRequestException('AI (ollama) вернул невалидный JSON результата.');
  }
}

function normalizeResult(kind: 'anamnesis' | 'imaging', raw: any): MedicalAnalyzerResult {
  const confidence = clamp01to100(Number(raw?.confidence));
  const urgency = normalizeUrgency(raw?.urgency);
  const diagnosis = safeTrimList(raw?.diagnosis, 10);
  const recommendations = safeTrimList(raw?.recommendations, 14);
  const additionalTests = safeTrimList(raw?.additionalTests, 14);
  const notesForDoctor = safeTrimList(raw?.notesForDoctor, 14);

  return {
    kind,
    confidence,
    urgency,
    diagnosis: diagnosis.length ? diagnosis : ['Недостаточно данных для гипотез.'],
    recommendations,
    additionalTests,
    notesForDoctor,
    disclaimer:
      'Результаты AI-анализа носят рекомендательный характер и не заменяют профессионального клинического суждения.',
  };
}
