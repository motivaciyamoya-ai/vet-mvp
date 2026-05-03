import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminVetEventsSourcesDto {
  @ApiPropertyOptional({ description: 'Построчно URL ICS; строки с # — комментарии' })
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  icsText?: string;

  @ApiPropertyOptional({ description: 'Построчно URL RSS' })
  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  rssText?: string;
}

export class AdminCreateManualVetEventDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(480)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(45_000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(480)
  location?: string;

  @ApiPropertyOptional({ description: 'https://…' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @ApiProperty({ example: new Date().toISOString() })
  @IsDateString()
  startsAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
