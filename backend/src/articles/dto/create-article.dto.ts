import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  excerpt: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100000)
  body: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
