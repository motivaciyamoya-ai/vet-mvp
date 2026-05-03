import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DoseByWeightDto {
  @ApiProperty({ description: 'мг/кг' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  mgPerKg: number;

  @ApiProperty({ description: 'кг' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  weightKg: number;

  @ApiProperty({ description: 'концентрация раствора, мг/мл' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  concentrationMgPerMl: number;
}
