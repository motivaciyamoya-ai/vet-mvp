import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateVetEventCommentDto {
  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body: string;
}
