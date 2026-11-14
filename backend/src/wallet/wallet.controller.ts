import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CreateDepositDto } from './dto/wallet.dto';
import { SetupWithdrawalAccountDto, SubmitWithdrawalDto } from './dto/withdrawal-setup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('deposit-methods')
  getDepositMethods(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.walletService.getDepositMethods(currentUser.agencyId);
  }

  @Post('deposit')
  createDeposit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateDepositDto,
  ) {
    return this.walletService.createDepositRequest(
      currentUser.userId,
      currentUser.agencyId,
      dto,
    );
  }

  @Get('my-requests')
  getMyRequests(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.walletService.getUserRequests(currentUser.userId);
  }

  @Get('restriction')
  getLatestRestriction(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.walletService.getLatestUserRestriction(currentUser.userId);
  }

  @Get('withdrawal-accounts')
  getWithdrawalAccounts(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.walletService.getUserWithdrawalAccounts(currentUser.userId);
  }

  @Post('withdrawal-account')
  setupWithdrawalAccount(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SetupWithdrawalAccountDto,
  ) {
    return this.walletService.setupWithdrawalAccount(currentUser.userId, dto);
  }

  @Post('withdraw')
  createWithdrawal(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SubmitWithdrawalDto,
  ) {
    return this.walletService.createWithdrawalRequest(
      currentUser.userId,
      currentUser.agencyId,
      dto,
    );
  }
}
