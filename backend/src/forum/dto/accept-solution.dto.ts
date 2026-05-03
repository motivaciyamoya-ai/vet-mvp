import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AcceptSolutionDto {
  @ApiProperty({
    description: 'ID сообщения форума (ForumPost): не первый пост темы и не ваш собственный ответ под темой',
    minLength: 8,
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty({ message: 'Укажите postId сообщения-решения' })
  @MinLength(8, { message: 'Некорректный идентификатор сообщения' })
  postId!: string;
}
