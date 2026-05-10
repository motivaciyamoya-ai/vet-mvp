import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { PatchArticleCommentDto } from './dto/patch-article-comment.dto';
import { PatchSubmitArticleDto } from './dto/patch-submit-article.dto';
import { SubmitArticleDto } from './dto/submit-article.dto';

@ApiTags('articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get('categories')
  categories() {
    return this.articles.categories();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Get('mine')
  mySubmissions(@CurrentUser() user: AuthUser, @Query('status') status?: 'pending' | 'all') {
    return this.articles.mySubmissions(user.id, status === 'all' ? 'all' : 'pending');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Get('preview/:id')
  previewById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.articles.previewById(id, user.id, user.role as UserRole);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('submit')
  submit(@CurrentUser() user: AuthUser, @Body() dto: SubmitArticleDto) {
    return this.articles.submitArticle(user.id, user.role as UserRole, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Patch('submit/:id')
  patchSubmit(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: PatchSubmitArticleDto,
  ) {
    return this.articles.patchPendingSubmission(user.id, id, dto);
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
    return this.articles.addComment(articleId, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Patch('comment/:commentId')
  patchArticleComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: PatchArticleCommentDto,
  ) {
    return this.articles.patchComment(commentId, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Delete('comment/:commentId')
  deleteArticleComment(@Param('commentId') commentId: string, @CurrentUser() user: AuthUser) {
    return this.articles.deleteComment(commentId, user.id);
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
    return this.articles.addComment(articleId, user.id, dto);
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
