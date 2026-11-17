import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PromoCodesService } from './promo-codes.service';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('promo-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  /** Player redeems a promo code */
  @Post('redeem')
  @Roles(UserRole.USER)
  redeem(
    @CurrentUser() user: AuthenticatedUser,
    @Body('code') code: string,
  ) {
    return this.promoCodesService.redeemPromoCode(user.userId, code);
  }

  /** Agency Admin lists promo codes */
  @Get('agency')
  @Roles(UserRole.AGENCY_ADMIN, UserRole.SUPER_ADMIN)
  getAgencyCodes(@CurrentUser() user: AuthenticatedUser) {
    return this.promoCodesService.getAgencyPromoCodes(user.agencyId || null);
  }

  /** Agency Admin creates a promo code */
  @Post('agency')
  @Roles(UserRole.AGENCY_ADMIN, UserRole.SUPER_ADMIN)
  createCode(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePromoCodeDto,
  ) {
    return this.promoCodesService.createPromoCode(user, dto);
  }

  /** Agency Admin toggles promo code status */
  @Patch('agency/:id/status')
  @Roles(UserRole.AGENCY_ADMIN, UserRole.SUPER_ADMIN)
  toggleStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.promoCodesService.togglePromoCodeStatus(user, id, isActive);
  }

  /** Agency Admin deletes a promo code */
  @Delete('agency/:id')
  @Roles(UserRole.AGENCY_ADMIN, UserRole.SUPER_ADMIN)
  deleteCode(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.promoCodesService.deletePromoCode(user, id);
  }
}
