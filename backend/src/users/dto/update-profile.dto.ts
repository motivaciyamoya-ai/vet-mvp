import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  jobTitleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '1990-05-12', description: 'ГГГГ-ММ-ДД' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_ONLY, { message: 'Дата рождения: формат ГГГГ-ММ-ДД' })
  birthDate?: string;
}
