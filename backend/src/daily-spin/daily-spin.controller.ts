import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DailySpinService } from './daily-spin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('daily-spin')
@UseGuards(JwtAuthGuard)
export class DailySpinController {
  constructor(private readonly dailySpinService: DailySpinService) {}

  @Get('status')
  getSpinStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.dailySpinService.getSpinStatus(user.userId);
  }

  @Post('spin')
  executeSpin(@CurrentUser() user: AuthenticatedUser) {
    return this.dailySpinService.executeSpin(user.userId);
  }
}
