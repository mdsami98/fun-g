import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { WalletService } from '../wallet/wallet.service';
import { CreateAgencyDto } from './dto/create-agency.dto';
import {
  CreateWalletNumberDto,
  SyncWalletNumbersDto,
  UpdateWalletNumberDto,
} from './dto/wallet-number.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UserRole } from '../common/enums/user-role.enum';
import { DepositRequestStatus } from '../wallet/entities/deposit-request.entity';
import { CreateRestrictionDto } from '../users/dto/create-restriction.dto';
import { AddBalanceDto } from '../wallet/dto/add-balance.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agencies')
export class AgenciesController {
  constructor(
    private readonly agenciesService: AgenciesService,
    private readonly walletService: WalletService,
  ) {}

  private checkAgencyAccess(currentUser: AuthenticatedUser, agencyId: string) {
    if (currentUser.role === UserRole.SUPER_ADMIN) return;
    if (
      currentUser.role === UserRole.AGENCY_ADMIN &&
      currentUser.agencyId === agencyId
    ) {
      return;
    }
    throw new ForbiddenException(
      'You do not have permission to access or modify this agency',
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateAgencyDto) {
    return this.agenciesService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll() {
    return this.agenciesService.findAll();
  }

  @Get(':agencyId/wallet-numbers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  getWalletNumbers(
    @Param('agencyId') agencyId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.agenciesService.findWalletNumbers(agencyId);
  }

  @Post(':agencyId/wallet-numbers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  createWalletNumber(
    @Param('agencyId') agencyId: string,
    @Body() dto: CreateWalletNumberDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.agenciesService.createWalletNumber(agencyId, dto);
  }

  @Put(':agencyId/wallet-numbers/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  updateWalletNumber(
    @Param('agencyId') agencyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWalletNumberDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.agenciesService.updateWalletNumber(agencyId, id, dto);
  }

  @Delete(':agencyId/wallet-numbers/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  deleteWalletNumber(
    @Param('agencyId') agencyId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.agenciesService.deleteWalletNumber(agencyId, id);
  }

  @Put(':agencyId/wallet-numbers')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  syncWalletNumbers(
    @Param('agencyId') agencyId: string,
    @Body() dto: SyncWalletNumbersDto | UpdateWalletNumberDto[],
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    const items = Array.isArray(dto) ? dto : dto.walletNumbers;
    return this.agenciesService.syncWalletNumbers(agencyId, items ?? []);
  }

  @Get(':agencyId/deposit-requests')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  getDepositRequests(
    @Param('agencyId') agencyId: string,
    @Query('status') status: DepositRequestStatus | undefined,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.walletService.getAgencyDepositRequests(agencyId, status);
  }

  @Get(':agencyId/deposit-stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  getDepositStats(
    @Param('agencyId') agencyId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.walletService.getAgencyDepositStats(agencyId);
  }

  @Patch(':agencyId/deposit-requests/:id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  approveDeposit(
    @Param('agencyId') agencyId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.walletService.approveDepositRequest(currentUser.userId, agencyId, id);
  }

  @Patch(':agencyId/deposit-requests/:id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  rejectDeposit(
    @Param('agencyId') agencyId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.walletService.rejectDepositRequest(currentUser.userId, agencyId, id);
  }

  @Get(':agencyId/users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  getAgencyUsers(
    @Param('agencyId') agencyId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.agenciesService.getAgencyUsers(agencyId);
  }

  @Get(':agencyId/users/:userId/restrictions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  getUserRestrictions(
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.agenciesService.getUserRestrictions(agencyId, userId);
  }

  @Post(':agencyId/users/:userId/restrictions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  addUserRestriction(
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
    @Body() dto: CreateRestrictionDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.agenciesService.addUserRestriction(agencyId, userId, dto.message);
  }

  @Patch(':agencyId/users/:userId/restrictions/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  updateUserRestriction(
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateRestrictionDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.agenciesService.updateUserRestriction(agencyId, userId, id, dto.message);
  }

  @Delete(':agencyId/users/:userId/restrictions/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  deleteUserRestriction(
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.agenciesService.deleteUserRestriction(agencyId, userId, id);
  }

  @Post(':agencyId/users/:userId/balance')
  @Roles(UserRole.SUPER_ADMIN, UserRole.AGENCY_ADMIN)
  addUserBalance(
    @Param('agencyId') agencyId: string,
    @Param('userId') userId: string,
    @Body() dto: AddBalanceDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    this.checkAgencyAccess(currentUser, agencyId);
    return this.walletService.creditUserBalance(agencyId, userId, dto);
  }
}
