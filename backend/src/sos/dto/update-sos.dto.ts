import { ApiProperty } from '@nestjs/swagger';
import { SosStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSosDto {
  @ApiProperty({ enum: SosStatus })
  @IsEnum(SosStatus)
  status: SosStatus;
}
