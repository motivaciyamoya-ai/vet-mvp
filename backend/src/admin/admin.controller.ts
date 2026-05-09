import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
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
import { LiveTrafficService } from '../live-traffic/live-traffic.service';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';
import { SecurityPoliciesService } from '../security/security-policies.service';
import { AdminTotpGuard } from './guards/admin-totp.guard';

@ApiTags('admin')
@ApiBearerAuth()
@SkipThrottle()
@UseGuards(JwtAuthGuard, RolesGuard, AdminTotpGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly dashboard: AdminDashboardService,
    private readonly dosageDrugs: DosageDrugsService,
    private readonly vetEvents: VetEventsService,
    private readonly liveTraffic: LiveTrafficService,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService,
    private readonly policies: SecurityPoliciesService,
  ) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('analytics')
  analytics() {
    return this.dashboard.analytics();
  }

  /** Снимок посещений в памяти процесса: IP, метод/путь, бот или человек (по User-Agent). */
  @Get('analytics/live-traffic')
  liveTrafficSnapshot(@Query('windowSec') windowSec?: string) {
    let w: number | undefined;
    if (windowSec != null && String(windowSec).trim() !== '') {
      const n = parseInt(String(windowSec), 10);
      if (!Number.isFinite(n) || n < 30 || n > 3600) {
        throw new BadRequestException('Параметр windowSec должен быть числом 30–3600.');
      }
      w = n;
    }
    return this.liveTraffic.getSnapshot(w);
  }

  @Get('settings')
  siteSettingsList() {
    return this.dashboard.siteSettings();
  }

  @Put('settings/:key')
  async putSiteSetting(
    @Param('key') key: string,
    @Body() dto: AdminPutSiteSettingDto,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
  ) {
    const k = decodeURIComponent(key);
    const row = await this.dashboard.putSiteSetting(k, dto.value);
    await this.audit.log({
      action: 'admin.site_setting.put',
      actorUserId: user.id,
      actorEmail: user.email,
      details: { key: k },
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
    if (k === 'site.maintenance.enabled' && dto.value.trim().toLowerCase() === 'true') {
      void this.alerts.notifyMaintenanceEnabled(user.email);
    }
    if (k.startsWith('site.security.')) {
      this.policies.invalidateCache();
    }
    return row;
  }

  @Delete('settings/:key')
  async deleteSiteSetting(@Param('key') key: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const k = decodeURIComponent(key);
    const out = await this.dashboard.deleteSiteSetting(k);
    await this.audit.log({
      action: 'admin.site_setting.delete',
      actorUserId: user.id,
      actorEmail: user.email,
      details: { key: k },
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
    if (k.startsWith('site.security.')) {
      this.policies.invalidateCache();
    }
    return out;
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
      organizers: dto.organizers,
      audience: dto.audience,
      eventFormat: dto.eventFormat,
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
  patchUser(
    @Param('id') id: string,
    @Body() dto: AdminPatchUserDto,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.admin.patchUser(id, dto, actor, {
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    });
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  @Get('forum/attachments-overview')
  forumAttachmentsOverview() {
    return this.admin.forumAttachmentsOverview();
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
