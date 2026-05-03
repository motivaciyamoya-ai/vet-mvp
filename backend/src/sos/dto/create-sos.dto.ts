import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SosUrgency } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSosDto {
  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  body: string;

  @ApiProperty({ example: 'собака' })
  @IsString()
  @MaxLength(80)
  animalKind: string;

  @ApiPropertyOptional({ enum: SosUrgency })
  @IsOptional()
  @IsEnum(SosUrgency)
  urgency?: SosUrgency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;
}
