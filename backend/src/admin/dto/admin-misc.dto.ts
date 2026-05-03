import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationSanction, SosStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminPatchReportDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  status: string;

  @ApiPropertyOptional({ enum: ModerationSanction })
  @IsOptional()
  @IsEnum(ModerationSanction)
  sanction?: ModerationSanction;

  @ApiPropertyOptional({ description: 'Пояснение для пользователя/бейджа (видно автору санкций и на аватарке).' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(800)
  sanctionReasonPublic?: string;

  @ApiPropertyOptional({
    description:
      'Длительность временной блокировки в часах (только для TEMP_SUSPEND). По умолчанию 72 часа, максимум 365 суток.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24 * 365)
  temporaryHours?: number;
}

export class AdminPatchSosDto {
  @ApiProperty({ enum: SosStatus })
  @IsEnum(SosStatus)
  status: SosStatus;
}
