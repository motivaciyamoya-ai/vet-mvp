import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ListingType, UserRole } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminPutSiteSettingDto } from './dto/admin-setting.dto';
import { AdminPatchUserDto } from './dto/admin-users.dto';
import {
  AdminCreateForumCategoryDto,
  AdminPatchForumCategoryDto,
  AdminPatchForumPostDto,
  AdminPatchForumThreadDto,
} from './dto/admin-forum.dto';
import {
  AdminCreateArticleCategoryDto,
  AdminCreateArticleDto,
  AdminPatchArticleCategoryDto,
  AdminPatchArticleDto,
} from './dto/admin-articles.dto';
import { AdminPatchListingDto } from './dto/admin-listings.dto';
import {
  AdminCreateCountryDto,
  AdminCreateJobTitleDto,
  AdminPatchCountryDto,
  AdminPatchJobTitleDto,
} from './dto/admin-reference.dto';
import { AdminPatchReportDto, AdminPatchSosDto } from './dto/admin-misc.dto';
import { PaginationQueryDto, SearchQueryDto } from './dto/admin-query.dto';
import { AdminVetcoinAdjustDto } from './dto/admin-vetcoin.dto';
import { DosageDrugsService } from '../dosage-drugs/dosage-drugs.service';
import { VetEventsService } from '../vet-events/vet-events.service';
import {
  AdminCreateDosageDrugDto,
  AdminPatchDosageDrugDto,
} from '../dosage-drugs/dto/admin-dosage-drug.dto';
import { AdminCreateManualVetEventDto, AdminVetEventsSourcesDto } from './dto/admin-events.dto';

@ApiTags('admin')
@ApiBearerAuth()
@SkipThrottle()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly dashboard: AdminDashboardService,
    private readonly dosageDrugs: DosageDrugsService,
    private readonly vetEvents: VetEventsService,
  ) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('analytics')
  analytics() {
    return this.dashboard.analytics();
  }

  @Get('settings')
  siteSettingsList() {
    return this.dashboard.siteSettings();
  }

  @Put('settings/:key')
  putSiteSetting(@Param('key') key: string, @Body() dto: AdminPutSiteSettingDto) {
    return this.dashboard.putSiteSetting(decodeURIComponent(key), dto.value);
  }

  @Delete('settings/:key')
  deleteSiteSetting(@Param('key') key: string) {
    return this.dashboard.deleteSiteSetting(decodeURIComponent(key));
  }

  /** Ручной запуск подтягивания мероприятий из ICS/RSS (см. settings events.sources.*). */
  @Post('events/sync')
  syncVetEventsFromOpenSources() {
    return this.vetEvents.syncExternalFeeds(false);
  }

  @Get('events/sources')
  vetEventsSources() {
    return this.vetEvents.getSourcesConfig();
  }

  @Put('events/sources')
  putVetEventsSources(@Body() dto: AdminVetEventsSourcesDto) {
    return this.vetEvents.putSourcesConfig(dto.icsText, dto.rssText);
  }

  @Post('events/manual')
  createManualVetEvent(@Body() dto: AdminCreateManualVetEventDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = dto.endsAt != null ? new Date(dto.endsAt) : undefined;
    return this.vetEvents.createManualEvent({
      title: dto.title,
      description: dto.description,
      location: dto.location,
      url: dto.url,
      startsAt,
      endsAt,
    });
  }

  @Get('events/recent')
  vetEventsRecent(@Query('take') take?: string) {
    return this.vetEvents.listEventsAdmin(take ? parseInt(take, 10) : 80);
  }

  @Delete('events/:id')
  deleteVetEvent(@Param('id') id: string) {
    return this.vetEvents.deleteEventById(id);
  }

  @Get('users')
  usersList(@Query() q: SearchQueryDto) {
    return this.admin.usersList(q.q, q.page, q.pageSize);
  }

  @Get('users/:id')
  userById(@Param('id') id: string) {
    return this.admin.userById(id);
  }

  @Patch('users/:id')
  patchUser(@Param('id') id: string, @Body() dto: AdminPatchUserDto) {
    return this.admin.patchUser(id, dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  @Get('forum/categories')
  forumCategories() {
    return this.admin.forumCategories();
  }

  @Post('forum/categories')
  createForumCategory(@Body() dto: AdminCreateForumCategoryDto) {
    return this.admin.createForumCategory(dto);
  }

  @Patch('forum/categories/:id')
  patchForumCategory(@Param('id') id: string, @Body() dto: AdminPatchForumCategoryDto) {
    return this.admin.patchForumCategory(id, dto);
  }

  @Delete('forum/categories/:id')
  deleteForumCategory(@Param('id') id: string) {
    return this.admin.deleteForumCategory(id);
  }

  @Get('forum/threads')
  forumThreads(@Query() q: SearchQueryDto) {
    return this.admin.forumThreadsList(q.q, q.page, q.pageSize);
  }

  @Get('forum/threads/:id')
  forumThreadById(@Param('id') id: string) {
    return this.admin.forumThreadById(id);
  }

  @Patch('forum/threads/:id')
  patchForumThread(@Param('id') id: string, @Body() dto: AdminPatchForumThreadDto) {
    return this.admin.patchForumThread(id, dto);
  }

  @Delete('forum/threads/:id')
  deleteForumThread(@Param('id') id: string) {
    return this.admin.deleteForumThread(id);
  }

  @Patch('forum/posts/:id')
  patchForumPost(@Param('id') id: string, @Body() dto: AdminPatchForumPostDto) {
    return this.admin.patchForumPost(id, dto);
  }

  @Delete('forum/posts/:id')
  deleteForumPost(@Param('id') id: string) {
    return this.admin.deleteForumPost(id);
  }

  @Get('articles/categories')
  articleCategories() {
    return this.admin.articleCategories();
  }

  @Post('articles/categories')
  createArticleCategory(@Body() dto: AdminCreateArticleCategoryDto) {
    return this.admin.createArticleCategory(dto);
  }

  @Patch('articles/categories/:id')
  patchArticleCategory(@Param('id') id: string, @Body() dto: AdminPatchArticleCategoryDto) {
    return this.admin.patchArticleCategory(id, dto);
  }

  @Delete('articles/categories/:id')
  deleteArticleCategory(@Param('id') id: string) {
    return this.admin.deleteArticleCategory(id);
  }

  @Get('articles')
  articles(@Query() q: SearchQueryDto) {
    return this.admin.articlesList(q.q, q.page, q.pageSize);
  }

  @Post('articles')
  createArticle(@Body() dto: AdminCreateArticleDto) {
    return this.admin.createArticle(dto);
  }

  @Patch('articles/:id')
  patchArticle(@Param('id') id: string, @Body() dto: AdminPatchArticleDto) {
    return this.admin.patchArticle(id, dto);
  }

  @Delete('articles/:id')
  deleteArticle(@Param('id') id: string) {
    return this.admin.deleteArticle(id);
  }

  @Get('listings')
  listings(
    @Query('type') type?: ListingType,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listingsList(
      type,
      q,
      page ? parseInt(page, 10) : undefined,
      pageSize ? parseInt(pageSize, 10) : undefined,
    );
  }

  @Patch('listings/:id')
  patchListing(@Param('id') id: string, @Body() dto: AdminPatchListingDto) {
    return this.admin.patchListing(id, dto);
  }

  @Delete('listings/:id')
  deleteListing(@Param('id') id: string) {
    return this.admin.deleteListing(id);
  }

  @Delete('listings/:listingId/messages/:messageId')
  deleteListingMessage(
    @Param('listingId') listingId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.admin.deleteListingMessage(listingId, messageId);
  }

  @Get('reports')
  reports() {
    return this.admin.reportsList();
  }

  @Patch('reports/:id')
  patchReport(@Param('id') id: string, @Body() dto: AdminPatchReportDto, @CurrentUser() user: AuthUser) {
    return this.admin.patchReport(id, dto, user.id);
  }

  @Get('sos')
  sosList(@Query() q: PaginationQueryDto) {
    return this.admin.sosList(q.page, q.pageSize);
  }

  @Patch('sos/:id')
  patchSos(@Param('id') id: string, @Body() dto: AdminPatchSosDto) {
    return this.admin.patchSos(id, dto.status);
  }

  @Get('reference/countries')
  countries() {
    return this.admin.countries();
  }

  @Post('reference/countries')
  createCountry(@Body() dto: AdminCreateCountryDto) {
    return this.admin.createCountry(dto);
  }

  @Patch('reference/countries/:id')
  patchCountry(@Param('id') id: string, @Body() dto: AdminPatchCountryDto) {
    return this.admin.patchCountry(id, dto);
  }

  @Delete('reference/countries/:id')
  deleteCountry(@Param('id') id: string) {
    return this.admin.deleteCountry(id);
  }

  @Get('reference/job-titles')
  jobTitles() {
    return this.admin.jobTitles();
  }

  @Post('reference/job-titles')
  createJobTitle(@Body() dto: AdminCreateJobTitleDto) {
    return this.admin.createJobTitle(dto);
  }

  @Patch('reference/job-titles/:id')
  patchJobTitle(@Param('id') id: string, @Body() dto: AdminPatchJobTitleDto) {
    return this.admin.patchJobTitle(id, dto);
  }

  @Delete('reference/job-titles/:id')
  deleteJobTitle(@Param('id') id: string) {
    return this.admin.deleteJobTitle(id);
  }

  /** Справочник препаратов калькулятора дозировок (CRUD, все записи вкл. неактивные) */
  @Get('dosage-drugs')
  dosageDrugsList() {
    return this.dosageDrugs.listAllForAdmin();
  }

  @Get('dosage-drugs/:id')
  dosageDrugById(@Param('id') id: string) {
    return this.dosageDrugs.findByIdOrThrowAdmin(id);
  }

  @Post('dosage-drugs')
  createDosageDrug(@Body() dto: AdminCreateDosageDrugDto) {
    return this.dosageDrugs.create(dto);
  }

  /** Добавляет в БД отсутствующие id из встроенного справочника (bundled prisma/vendor/vetDosageReference.cjs). */
  @Post('dosage-drugs/import-builtin')
  importBuiltinDosageDrugs() {
    return this.dosageDrugs.importBuiltinMissing();
  }

  @Patch('dosage-drugs/:id')
  patchDosageDrug(@Param('id') id: string, @Body() dto: AdminPatchDosageDrugDto) {
    return this.dosageDrugs.patch(id, dto);
  }

  @Delete('dosage-drugs/:id')
  deleteDosageDrug(@Param('id') id: string) {
    return this.dosageDrugs.remove(id);
  }

  @Get('push-tokens')
  pushTokens(@Query() q: PaginationQueryDto) {
    return this.admin.pushTokens(q.page, q.pageSize);
  }

  @Delete('push-tokens/:id')
  deletePushToken(@Param('id') id: string) {
    return this.admin.deletePushToken(id);
  }

  @Post('vetcoin/adjust')
  adjustVetcoin(@Body() dto: AdminVetcoinAdjustDto) {
    return this.admin.adjustVetcoin(dto);
  }
}
