import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateReportDto {
  @ApiProperty({ enum: ['OPEN', 'REVIEWED', 'DISMISSED'] })
  @IsString()
  @IsIn(['OPEN', 'REVIEWED', 'DISMISSED'])
  status: string;
}
