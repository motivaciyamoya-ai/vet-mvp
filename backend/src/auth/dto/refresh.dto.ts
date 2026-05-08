import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({ description: 'Если refresh в httpOnly-cookie — поле можно не передавать.' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  refreshToken?: string;
}
