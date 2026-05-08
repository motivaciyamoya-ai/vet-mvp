import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  /** Достаточно строгая проверка формата email без утечек внутренних доменов/примеров. */
  @Matches(/^[^\s@]+@[^\s@]+$/, {
    message: 'Введите корректный email адрес (например user@example.com)',
  })
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: '********' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Код TOTP, если для аккаунта включена 2FA' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  totpCode?: string;
}
