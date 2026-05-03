import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminVetcoinAdjustDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Положительное — начисление, отрицательное — списание' })
  @IsInt()
  delta: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  reason: string;
}
