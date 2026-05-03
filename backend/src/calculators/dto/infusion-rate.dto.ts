import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InfusionRateDto {
  @ApiProperty({ description: 'капель в минуту' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  dropsPerMinute: number;

  @ApiProperty({ description: 'капель на 1 мл (например 20)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  dropsPerMl: number;
}
