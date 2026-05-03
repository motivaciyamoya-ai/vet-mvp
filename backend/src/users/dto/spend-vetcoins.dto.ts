import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export enum VetcoinClientSpendAction {
  TOOL_DOSAGE = 'TOOL_DOSAGE',
  TOOL_ANALYZER = 'TOOL_ANALYZER',
  BADGE_PURCHASE = 'BADGE_PURCHASE',
}

export class SpendVetcoinsDto {
  @ApiProperty({ enum: VetcoinClientSpendAction })
  @IsEnum(VetcoinClientSpendAction)
  action!: VetcoinClientSpendAction;

  /** Для BADGE_PURCHASE — id из клиентского магазина ярлыков (expert, helper, …). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  badgeId?: string;

  @ApiPropertyOptional({
    description:
      'Для BADGE_PURCHASE обязательно true — ярлыки только дарятся; на сервере всегда +50 VetCoin к стоимости оформления',
  })
  @IsOptional()
  @IsBoolean()
  gift?: boolean;
}
