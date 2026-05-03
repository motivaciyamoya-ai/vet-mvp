import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AdminPutSiteSettingDto {
  @ApiProperty({ description: 'Значение (JSON-строка, текст, URL и т.д.)' })
  @IsString()
  @MinLength(0)
  @MaxLength(50000)
  value: string;
}
