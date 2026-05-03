import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { ForumService } from './forum.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { AcceptSolutionDto } from './dto/accept-solution.dto';
import { UpdateThreadOpeningDto } from './dto/update-thread-opening.dto';
import { UpdateForumPostDto } from './dto/update-forum-post.dto';
import { RegisterThreadViewDto } from './dto/register-thread-view.dto';

@ApiTags('forum')
@Controller('forum')
export class ForumController {
  constructor(
    private readonly forum: ForumService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private optionalUserIdFromAuthHeader(authHeader?: string): string | null {
    if (!authHeader?.toLowerCase().startsWith('bearer ')) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;
    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') || 'dev-access-secret',
      });
      return typeof payload?.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  @Get('categories')
  categories() {
    return this.forum.categories();
  }

  @Get('hot-topic-pricing')
  hotTopicPricing() {
    return this.forum.hotTopicPricing();
  }

  @Get('categories/:slug/threads')
  threads(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.forum.threadsByCategorySlug(
      slug,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }

  /** Лента последних тем (должен быть выше `:id`, чтобы `feed` не считался id). */
  @Get('threads/feed')
  threadsFeed(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.forum.threadsFeed(
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 30,
    );
  }

  /** Последний «герой»: автор ответа, который автор темы отметил как решение */
  @Get('heroes/latest')
  latestSolutionHeroSpotlight() {
    return this.forum.latestSolutionHeroSpotlight();
  }

  /** Статистика решённых тем и уникальных помогших по разделам форума */
  @Get('heroes/by-category-stats')
  heroesStatsByCategory() {
    return this.forum.heroesStatsByCategory();
  }

  /** Публично: засчитывает один просмотр на уникального посетителя (JWT или anonVisitorId). */
  @Post('threads/:id/register-view')
  registerThreadView(
    @Param('id') id: string,
    @Body() dto: RegisterThreadViewDto,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.optionalUserIdFromAuthHeader(authorization);
    return this.forum.registerUniqueView(id, {
      userId,
      anonVisitorId: dto?.anonVisitorId ?? null,
    });
  }

  /** Переключает лайк темы (JWT или anonVisitorId). */
  @Post('threads/:id/toggle-like')
  toggleThreadLike(
    @Param('id') id: string,
    @Body() dto: RegisterThreadViewDto,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = this.optionalUserIdFromAuthHeader(authorization);
    return this.forum.toggleThreadLike(id, {
      userId,
      anonVisitorId: dto?.anonVisitorId ?? null,
    });
  }

  /**
   * Решение должно быть зарегистрировано ДО `@Get('threads/:id')` — иначе в некоторых окружениях
   * длинный path с двумя сегментами после id не находится («Cannot POST …/accept-solution»).
   * Дубликат без дефиса — совместимость с прокси/WAF.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post(['threads/:id/accept-solution', 'threads/:id/solution'])
  acceptSolution(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AcceptSolutionDto,
  ) {
    return this.forum.acceptSolution(id, user.id, dto.postId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('threads/:id/posts')
  addPost(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.forum.addPost(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Patch('threads/:id')
  patchThreadOpening(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateThreadOpeningDto,
  ) {
    return this.forum.updateThreadOpening(id, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Patch('posts/:postId')
  patchPost(
    @CurrentUser() user: AuthUser,
    @Param('postId') postId: string,
    @Body() dto: UpdateForumPostDto,
  ) {
    return this.forum.updateForumPost(user.id, postId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, ModerationGuard)
  @Post('threads')
  createThread(@CurrentUser() user: AuthUser, @Body() dto: CreateThreadDto) {
    return this.forum.createThread(user.id, dto);
  }

  /** Гость может передать anonVisitorId, чтобы узнать, стоит ли уже лайк с этого браузера. */
  @Get('threads/:id')
  thread(
    @Param('id') id: string,
    @Query('anonVisitorId') anonVisitorId?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const viewerUserId = this.optionalUserIdFromAuthHeader(authorization);
    return this.forum.threadById(id, {
      viewerUserId,
      anonVisitorId: anonVisitorId ?? null,
    });
  }

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.forum.search(
      q,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }
}
