import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class AdminCreateCountryDto {
  @ApiProperty()
  @IsString()
  @Length(2, 3)
  code: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  nameRu: string;
}

export class AdminPatchCountryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 3)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameRu?: string;
}

export class AdminCreateJobTitleDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  nameRu: string;
}

export class AdminPatchJobTitleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  nameRu?: string;
}

