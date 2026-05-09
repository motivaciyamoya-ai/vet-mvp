import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdminAiToolsConfigDto {
  @ApiPropertyOptional({ enum: ['openai', 'ollama'], description: 'Провайдер AI' })
  @IsOptional()
  @IsString()
  @IsIn(['openai', 'ollama'])
  provider?: string;

  @ApiPropertyOptional({
    description:
      'OpenAI API key; не передавайте поле, чтобы сохранить текущее значение из БД. Передайте пустую строку, чтобы удалить ключ из БД и использовать только переменную окружения OPENAI_API_KEY.',
  })
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(4096)
  openaiApiKey?: string | null;

  @ApiPropertyOptional({ example: 'gpt-4o-mini' })
  @IsOptional()
  @IsString()
  @MinLength(0)
  @MaxLength(120)
  openaiModel?: string;

  /** Базовый URL API без завершающего слэша, например https://api.openai.com/v1 */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  openaiBaseUrl?: string;

  @ApiPropertyOptional({ example: 'http://ollama:11434' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ollamaBaseUrl?: string;

  @ApiPropertyOptional({ example: 'llava:7b' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  ollamaVisionModel?: string;

  @ApiPropertyOptional({ description: 'Температура сэмплирования для анализа (0..2)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  analyzerTemperature?: number;

  @ApiPropertyOptional({ description: 'Максимум изображений за один запрос (1–6)' })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(1)
  @Max(6)
  analyzerMaxImages?: number;

  @ApiPropertyOptional({ description: 'Включить эндпоинт медицинского анализа для пользователей' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  medicalAnalyzerEnabled?: boolean;
}
