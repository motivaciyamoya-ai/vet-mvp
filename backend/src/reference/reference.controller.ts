import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ForumService } from '../forum/forum.service';
import { ReferenceService } from './reference.service';
import { SpecialistsListQueryDto } from './dto/specialists-query.dto';

@ApiTags('reference')
@Controller('reference')
export class ReferenceController {
  constructor(
    private readonly ref: ReferenceService,
    private readonly forum: ForumService,
  ) {}

  @Get('countries')
  countries() {
    return this.ref.countries();
  }

  @Get('job-titles')
  jobTitles() {
    return this.ref.jobTitles();
  }

  @Get('specialists/overview')
  specialistsOverview() {
    return this.ref.specialistsOverview();
  }

  @Get('specialists/by-country')
  specialistsByCountry() {
    return this.ref.specialistsByCountry();
  }

  @Get('specialists')
  specialistsList(@Query() query: SpecialistsListQueryDto) {
    return this.ref.specialistsList(query);
  }

  /**
   * Герои форума (то же тело ответа, что GET /forum/heroes/latest) — здесь же, где уже отдаётся /reference/specialists/*.
   */
  @Get('forum-heroes/latest')
  forumHeroesLatestSpotlight() {
    return this.forum.latestSolutionHeroSpotlight();
  }

  @Get('forum-heroes/by-category-stats')
  forumHeroesByCategoryStats() {
    return this.forum.heroesStatsByCategory();
  }
}
