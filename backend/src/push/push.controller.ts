import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModerationGuard } from '../moderation/moderation.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { PushService } from './push.service';
import { RegisterPushDto } from './dto/register-push.dto';

@ApiTags('push')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ModerationGuard)
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Post('register')
  register(@CurrentUser() user: AuthUser, @Body() dto: RegisterPushDto) {
    return this.push.register(user.id, dto.token, dto.platform);
  }
}
