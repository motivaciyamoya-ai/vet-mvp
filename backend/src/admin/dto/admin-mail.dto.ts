import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminMailPutDto {
  @ApiPropertyOptional({ description: 'Пустая строка — удалить из БД и использовать SMTP_HOST из .env' })
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(500)
  smtpHost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(20)
  smtpPort?: string;

  @ApiPropertyOptional({ enum: ['true', 'false', ''] })
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(10)
  smtpSecure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(500)
  smtpUser?: string;

  @ApiPropertyOptional({
    description:
      'Не передавайте поле — оставить пароль как есть. Пустая строка — удалить из БД (будет SMTP_PASS из .env). Новое значение — сохранить в БД.',
  })
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(2000)
  smtpPass?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(500)
  smtpFrom?: string;

  @ApiPropertyOptional({ description: 'Куда слать служебные алерты (вход админа и т. д.)' })
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(500)
  alertTo?: string;

  @ApiPropertyOptional({ description: 'Публичный URL фронта без завершающего слэша' })
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(500)
  frontendUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(500)
  verifySubject?: string;

  @ApiPropertyOptional({ description: 'Плейсхолдеры: {{verifyUrl}}, {{email}}' })
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(200_000)
  verifyTextTemplate?: string;

  @ApiPropertyOptional({ description: 'HTML, плейсхолдеры: {{verifyUrl}}, {{email}}' })
  @IsOptional()
  @Transform(({ value }) => (value === null ? '' : value))
  @IsString()
  @MaxLength(500_000)
  verifyHtmlTemplate?: string;
}

export class AdminMailBroadcastDto {
  @ApiProperty({ example: 'Новости VetConnect' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  subject!: string;

  @ApiProperty({ description: 'Текст письма; {{email}}, {{frontendUrl}}' })
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  bodyText!: string;

  @ApiPropertyOptional({ description: 'HTML; {{email}}, {{frontendUrl}}' })
  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  bodyHtml?: string;

  @ApiProperty({ enum: ['all', 'verified', 'unverified'] })
  @IsString()
  @IsIn(['all', 'verified', 'unverified'])
  audience!: 'all' | 'verified' | 'unverified';

  @ApiPropertyOptional({ description: 'Только посчитать получателей, без отправки' })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
