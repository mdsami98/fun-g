import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { VipService } from './vip.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('vip')
@UseGuards(JwtAuthGuard)
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @Get('me')
  getVipStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.vipService.getVipStatus(user.userId);
  }

  @Post('claim/:level')
  claimReward(
    @CurrentUser() user: AuthenticatedUser,
    @Param('level', ParseIntPipe) level: number,
  ) {
    return this.vipService.claimReward(user.userId, level);
  }
}
