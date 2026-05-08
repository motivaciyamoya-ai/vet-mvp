import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class TotpCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/)
  code: string;
}

export class TotpDisableDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
