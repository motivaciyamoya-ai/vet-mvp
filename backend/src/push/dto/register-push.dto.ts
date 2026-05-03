import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPushDto {
  @ApiProperty({ description: 'FCM token или аналог' })
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token: string;

  @ApiProperty({ example: 'android' })
  @IsString()
  @MaxLength(32)
  platform: string;
}
