import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateArticleCommentDto } from './dto/create-article-comment.dto';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get('categories')
  categories() {
    return this.articles.categories();
  }

  @Get()
  list(
    @Query('q') q?: string,
    @Query('categorySlug') categorySlug?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.articles.list(
      q,
      categorySlug,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /**
   * Основные маршруты комментариев: литеральный префикс `comments/` до параметра `:id`.
   * Некоторые прокси или старые билды давали «Cannot GET» на `:articleId/comments`.
   */
  @Get('comments/:articleId')
  articleComments(@Param('articleId') articleId: string) {
    return this.articles.commentsForArticle(articleId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('comments/:articleId')
  addArticleComment(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateArticleCommentDto,
  ) {
    return this.articles.addComment(articleId, user.id, dto.body);
  }

  /** Совместимость со старым URL */
  @Get(':articleId/comments')
  articleCommentsLegacy(@Param('articleId') articleId: string) {
    return this.articles.commentsForArticle(articleId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post(':articleId/comments')
  addArticleCommentLegacy(
    @Param('articleId') articleId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateArticleCommentDto,
  ) {
    return this.articles.addComment(articleId, user.id, dto.body);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.articles.byId(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateArticleDto) {
    return this.articles.create(user.id, dto);
  }
}
