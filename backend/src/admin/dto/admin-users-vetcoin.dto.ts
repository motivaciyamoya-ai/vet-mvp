import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AdminSetUserVetcoinDto {
  @ApiProperty({ description: 'Новый абсолютный баланс VetCoin (целое число ≥ 0)' })
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  vetCoinBalance: number;

  @ApiProperty({ description: 'Пароль текущего администратора (подтверждение)' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  adminPassword: string;

  @ApiPropertyOptional({ description: 'Комментарий в журнале начислений' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
