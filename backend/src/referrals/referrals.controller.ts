import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UpdateReferralConfigDto } from './dto/update-referral-config.dto';
import { UpdateAgencyDefaultReferralDto } from './dto/update-agency-default-referral.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Controller()
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  private checkAgencyAccess(currentUser: AuthenticatedUser, agencyId: string) {
    if (currentUser.role === UserRole.SUPER_ADMIN) return;
    if (currentUser.role === UserRole.AGENCY_ADMIN && currentUser.agencyId === agencyId) return;
    throw new ForbiddenException('You do not have permission to access or modify this agency');
  }

  // --- Player Endpoints ---

  @UseGuards(JwtAuthGuard)
  @Get('referrals/me')
  getMyReferralDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.getUserReferralDashboard(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('referrals/regenerate')
  regenerateMyCode(@CurrentUser() user: AuthenticatedUser) {
    return this.referralsService.regenerateReferralCode(user.userId);
  }

  @Get('referrals/validate/:code')
  async validateCode(@Param('code') code: string) {
    const result = await this.referralsService.validateReferralCode(code);
    return {
      valid: true,
      agencyName: result.agency.name,
      agencyCode: result.agency.agencyCode,
      remainingQuota: result.remainingQuota,
    };
  }

  // --- Agency Admin Endpoints ---

  @UseGuards(JwtAuthGuard)
  @Get('agencies/:agencyId/referrals/users/:userId')
  getAgencyUserReferralConfig(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.referralsService.getAgencyUserReferralConfig(agencyId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('agencies/:agencyId/referrals/users/:userId')
  updateAgencyUserReferralConfig(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateReferralConfigDto,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.referralsService.updateAgencyUserReferralConfig(agencyId, userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('agencies/:agencyId/referrals/history')
  getAgencyReferralHistory(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('agencyId') agencyId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.referralsService.getAgencyReferralHistory(agencyId, page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @UseGuards(JwtAuthGuard)
  @Get('agencies/:agencyId/referrals/default-config')
  getAgencyDefaultReferralConfig(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('agencyId') agencyId: string,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.referralsService.getAgencyDefaultReferralConfig(agencyId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('agencies/:agencyId/referrals/default-config')
  updateAgencyDefaultReferralConfig(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('agencyId') agencyId: string,
    @Body() dto: UpdateAgencyDefaultReferralDto,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.referralsService.updateAgencyDefaultReferralConfig(agencyId, dto);
  }
}
