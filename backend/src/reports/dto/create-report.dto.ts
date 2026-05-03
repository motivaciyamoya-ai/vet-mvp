import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportTargetType } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const REPORT_TARGETS = [
  'THREAD',
  'POST',
  'USER',
  'DIRECT_MESSAGE',
  'ARTICLE',
  'ARTICLE_COMMENT',
  'VET_EVENT_COMMENT',
  'LISTING_MESSAGE',
  'LOBBY_MESSAGE',
] as const;

type ReportTargetApi = (typeof REPORT_TARGETS)[number];

export class CreateReportDto {
  @ApiProperty({ enum: REPORT_TARGETS })
  @IsIn(REPORT_TARGETS)
  targetType: ReportTargetApi;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  threadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postId?: string;

  @ApiPropertyOptional({ description: 'Для USER' })
  @IsOptional()
  @IsString()
  reportedUserId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  directMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  articleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  articleCommentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vetEventCommentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  listingMessageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lobbyMessageId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
