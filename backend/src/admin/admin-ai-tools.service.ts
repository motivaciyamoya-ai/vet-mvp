import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAiToolsConfigDto } from './dto/admin-ai-tools.dto';
import {
  AI_SITE_KEYS,
  maskApiKey,
  resolveAiRuntime,
} from '../ai-tools/ai-tools-config';

@Injectable()
export class AdminAiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async siteAiRecord(): Promise<Record<string, string>> {
    const rows = await this.prisma.siteSetting.findMany({
      where: { key: { startsWith: 'ai.' } },
    });
    const out: Record<string, string> = {};
    for (const r of rows) {
      out[r.key] = r.value;
    }
    return out;
  }

  async getAiToolsConfig() {
    const site = await this.siteAiRecord();
    const resolved = resolveAiRuntime(site, this.config);
    const key = maskApiKey(resolved.openaiApiKey);

    return {
      effective: {
        provider: resolved.provider,
        openaiModel: resolved.openaiModel,
        openaiBaseUrl: resolved.openaiBaseUrl,
        ollamaBaseUrl: resolved.ollamaBaseUrl,
        ollamaVisionModel: resolved.ollamaVisionModel,
        analyzerTemperature: resolved.temperature,
        analyzerMaxImages: resolved.maxImages,
        medicalAnalyzerEnabled: resolved.medicalAnalyzerEnabled,
        medicalAnalyzerAnamnesisEnabled: resolved.medicalAnalyzerAnamnesisEnabled,
        medicalAnalyzerImagingEnabled: resolved.medicalAnalyzerImagingEnabled,
      },
      openaiApiKeyMasked: key.preview,
      openaiApiKeyConfigured: key.set,
      hints: {
        providerSource: resolved.providerSource,
        envFallback: {
          hasOpenAiKeyEnv: !!(this.config.get<string>('OPENAI_API_KEY') ?? '').trim(),
          hasAiProviderEnv: !!(this.config.get<string>('AI_PROVIDER') ?? '').trim(),
        },
      },
      storedKeys: Object.keys(site).filter((k) => k.startsWith('ai.')).sort(),
    };
  }

  async putAiToolsConfig(dto: AdminAiToolsConfigDto) {
    const upsert = async (key: string, value: string) => {
      await this.prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    };

    const delKey = async (key: string) => {
      try {
        await this.prisma.siteSetting.delete({ where: { key } });
      } catch {
        /* нет строки — ок */
      }
    };

    if (dto.provider !== undefined) {
      await upsert(AI_SITE_KEYS.provider, dto.provider.trim());
    }

    if (dto.openaiApiKey !== undefined) {
      const v = dto.openaiApiKey ?? '';
      if (!v.trim()) await delKey(AI_SITE_KEYS.openaiApiKey);
      else await upsert(AI_SITE_KEYS.openaiApiKey, v.trim());
    }

    if (dto.openaiModel !== undefined) {
      const v = dto.openaiModel.trim();
      if (v) await upsert(AI_SITE_KEYS.openaiModel, v);
      else await delKey(AI_SITE_KEYS.openaiModel);
    }

    if (dto.openaiBaseUrl !== undefined) {
      const v = dto.openaiBaseUrl.trim();
      if (v) await upsert(AI_SITE_KEYS.openaiBaseUrl, v.replace(/\/+$/, ''));
      else await delKey(AI_SITE_KEYS.openaiBaseUrl);
    }

    if (dto.ollamaBaseUrl !== undefined) {
      const v = dto.ollamaBaseUrl.trim();
      if (v) await upsert(AI_SITE_KEYS.ollamaBaseUrl, v.replace(/\/+$/, ''));
      else await delKey(AI_SITE_KEYS.ollamaBaseUrl);
    }

    if (dto.ollamaVisionModel !== undefined) {
      const v = dto.ollamaVisionModel.trim();
      if (v) await upsert(AI_SITE_KEYS.ollamaVisionModel, v);
      else await delKey(AI_SITE_KEYS.ollamaVisionModel);
    }

    if (dto.analyzerTemperature !== undefined) {
      await upsert(AI_SITE_KEYS.analyzerTemperature, String(dto.analyzerTemperature));
    }

    if (dto.analyzerMaxImages !== undefined) {
      await upsert(AI_SITE_KEYS.analyzerMaxImages, String(Math.round(dto.analyzerMaxImages)));
    }

    if (dto.medicalAnalyzerEnabled !== undefined) {
      await upsert(AI_SITE_KEYS.medicalAnalyzerEnabled, dto.medicalAnalyzerEnabled ? 'true' : 'false');
    }

    if (dto.medicalAnalyzerAnamnesisEnabled !== undefined) {
      await upsert(
        AI_SITE_KEYS.medicalAnalyzerAnamnesisEnabled,
        dto.medicalAnalyzerAnamnesisEnabled ? 'true' : 'false',
      );
    }

    if (dto.medicalAnalyzerImagingEnabled !== undefined) {
      await upsert(
        AI_SITE_KEYS.medicalAnalyzerImagingEnabled,
        dto.medicalAnalyzerImagingEnabled ? 'true' : 'false',
      );
    }

    return this.getAiToolsConfig();
  }
}
