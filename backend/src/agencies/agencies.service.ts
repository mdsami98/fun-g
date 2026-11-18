import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Agency } from './entities/agency.entity';
import {
  AgencyWalletNumber,
  WalletAccountType,
} from './entities/agency-wallet-number.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
import { DepositRequest } from '../wallet/entities/deposit-request.entity';
import { GameBet } from '../game/entities/game-bet.entity';
import { CreateAgencyDto } from './dto/create-agency.dto';
import {
  CreateWalletNumberDto,
  UpdateWalletNumberDto,
} from './dto/wallet-number.dto';

export interface MoneyFlowFilterDto {
  agencyId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
    @InjectRepository(AgencyWalletNumber)
    private readonly walletNumbersRepository: Repository<AgencyWalletNumber>,
    private readonly usersService: UsersService,
    @Optional()
    private readonly dataSource?: DataSource,
  ) {}

  async create(dto: CreateAgencyDto) {
    const existingAgency = await this.agenciesRepository.findOne({
      where: { agencyCode: dto.agencyCode },
    });
    if (existingAgency) {
      throw new ConflictException('Agency code already in use');
    }

    const existingAdmin = await this.usersService.findByPhone(dto.adminPhone);
    if (existingAdmin) {
      throw new ConflictException('Phone number already registered');
    }

    const agency = await this.agenciesRepository.save(
      this.agenciesRepository.create({
        name: dto.name,
        agencyCode: dto.agencyCode,
        bkashNumber: dto.bkashNumber,
      }),
    );

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    const admin = await this.usersService.create({
      phone: dto.adminPhone,
      password: passwordHash,
      name: dto.adminName,
      role: UserRole.AGENCY_ADMIN,
      agencyId: agency.id,
    });

    return { agency, admin };
  }

  findAll(): Promise<Agency[]> {
    return this.agenciesRepository.find();
  }

  findById(id: string): Promise<Agency | null> {
    return this.agenciesRepository.findOne({ where: { id } });
  }

  findByCode(agencyCode: string): Promise<Agency | null> {
    return this.agenciesRepository.findOne({ where: { agencyCode } });
  }

  async findWalletNumbers(agencyId: string): Promise<AgencyWalletNumber[]> {
    const agency = await this.findById(agencyId);
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    return this.walletNumbersRepository.find({
      where: { agencyId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  async createWalletNumber(
    agencyId: string,
    dto: CreateWalletNumberDto,
  ): Promise<AgencyWalletNumber> {
    const agency = await this.findById(agencyId);
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    const walletNumber = this.walletNumbersRepository.create({
      agencyId,
      provider: dto.provider,
      number: dto.number.trim(),
      accountType: dto.accountType ?? WalletAccountType.PERSONAL,
      isActive: dto.isActive ?? true,
    });

    return this.walletNumbersRepository.save(walletNumber);
  }

  async updateWalletNumber(
    agencyId: string,
    id: string,
    dto: UpdateWalletNumberDto,
  ): Promise<AgencyWalletNumber> {
    const walletNumber = await this.walletNumbersRepository.findOne({
      where: { id, agencyId },
    });
    if (!walletNumber) {
      throw new NotFoundException('Wallet number not found');
    }

    if (dto.provider !== undefined) {
      walletNumber.provider = dto.provider;
    }
    if (dto.number !== undefined) {
      walletNumber.number = dto.number.trim();
    }
    if (dto.accountType !== undefined) {
      walletNumber.accountType = dto.accountType;
    }
    if (dto.isActive !== undefined) {
      walletNumber.isActive = dto.isActive;
    }

    return this.walletNumbersRepository.save(walletNumber);
  }

  async deleteWalletNumber(
    agencyId: string,
    id: string,
  ): Promise<{ success: boolean; id: string }> {
    const walletNumber = await this.walletNumbersRepository.findOne({
      where: { id, agencyId },
    });
    if (!walletNumber) {
      throw new NotFoundException('Wallet number not found');
    }

    await this.walletNumbersRepository.remove(walletNumber);
    return { success: true, id };
  }

  async syncWalletNumbers(
    agencyId: string,
    items: UpdateWalletNumberDto[],
  ): Promise<AgencyWalletNumber[]> {
    const agency = await this.findById(agencyId);
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    const existing = await this.walletNumbersRepository.find({
      where: { agencyId },
    });
    const existingMap = new Map(existing.map((item) => [String(item.id), item]));

    const retainedIds = new Set<string>();

    for (const item of items) {
      const stringId = item.id ? String(item.id) : undefined;
      if (stringId && existingMap.has(stringId)) {
        retainedIds.add(stringId);
        const entity = existingMap.get(stringId)!;
        if (item.provider !== undefined) entity.provider = item.provider;
        if (item.number !== undefined) entity.number = item.number.trim();
        if (item.accountType !== undefined) entity.accountType = item.accountType;
        if (item.isActive !== undefined) entity.isActive = item.isActive;
        await this.walletNumbersRepository.save(entity);
      } else {
        const newEntity = this.walletNumbersRepository.create({
          agencyId,
          provider: item.provider!,
          number: (item.number ?? '').trim(),
          accountType: item.accountType ?? WalletAccountType.PERSONAL,
          isActive: item.isActive !== undefined ? item.isActive : true,
        });
        const saved = await this.walletNumbersRepository.save(newEntity);
        retainedIds.add(String(saved.id));
      }
    }

    const toDelete = existing.filter((item) => !retainedIds.has(String(item.id)));
    if (toDelete.length > 0) {
      await this.walletNumbersRepository.remove(toDelete);
    }

    return this.walletNumbersRepository.find({
      where: { agencyId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  async getAgencyUsers(agencyId: string) {
    return this.usersService.findByAgency(agencyId);
  }

  private async getAgencyUserOrFail(agencyId: string, userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || user.agencyId !== agencyId) {
      throw new NotFoundException('User not found in this agency');
    }
    return user;
  }

  async getUserRestrictions(agencyId: string, userId: string) {
    await this.getAgencyUserOrFail(agencyId, userId);
    return this.usersService.findRestrictionsByUser(userId);
  }

  async addUserRestriction(agencyId: string, userId: string, message: string) {
    await this.getAgencyUserOrFail(agencyId, userId);
    return this.usersService.addRestriction(userId, message);
  }

  private async getUserRestrictionOrFail(
    agencyId: string,
    userId: string,
    restrictionId: string,
  ) {
    await this.getAgencyUserOrFail(agencyId, userId);
    const restriction = await this.usersService.findRestrictionById(restrictionId);
    if (!restriction || restriction.userId !== userId) {
      throw new NotFoundException('Restriction not found for this player');
    }
    return restriction;
  }

  async updateUserRestriction(
    agencyId: string,
    userId: string,
    restrictionId: string,
    message: string,
  ) {
    await this.getUserRestrictionOrFail(agencyId, userId, restrictionId);
    return this.usersService.updateRestriction(restrictionId, message);
  }

  async deleteUserRestriction(agencyId: string, userId: string, restrictionId: string) {
    await this.getUserRestrictionOrFail(agencyId, userId, restrictionId);
    await this.usersService.deleteRestriction(restrictionId);
    return { success: true, id: restrictionId };
  }

  async toggleAgencyStatus(agencyId: string, isActive: boolean): Promise<Agency> {
    const agency = await this.agenciesRepository.findOne({ where: { id: agencyId } });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }
    agency.isActive = isActive;
    const saved = await this.agenciesRepository.save(agency);

    if (this.dataSource) {
      const userRepo = this.dataSource.getRepository(User);
      await userRepo.update({ agencyId }, { isActive });
    }

    return saved;
  }

  async getMoneyFlowAnalytics(params: MoneyFlowFilterDto) {
    if (!this.dataSource) {
      return {
        summary: {
          totalDeposits: '0.00',
          totalWithdrawals: '0.00',
          netCashflow: '0.00',
          pendingDeposits: '0.00',
          pendingWithdrawals: '0.00',
          pendingDepositsCount: 0,
          pendingWithdrawalsCount: 0,
          turnover: '0.00',
          playerWins: '0.00',
          ggr: '0.00',
          bonusExpenses: '0.00',
          activeAgenciesCount: 0,
          totalAgenciesCount: 0,
          totalPlayersCount: 0,
        },
        bonusesBreakdown: {
          referral: '0.00',
          spin: '0.00',
          vip: '0.00',
          promo: '0.00',
          adminCredit: '0.00',
        },
        agencies: [],
      };
    }

    let start: Date | null = null;
    let end: Date | null = null;

    if (params.startDate) {
      start = new Date(params.startDate);
      if (params.startDate.length === 10) {
        start.setHours(0, 0, 0, 0);
      }
    }
    if (params.endDate) {
      end = new Date(params.endDate);
      if (params.endDate.length === 10) {
        end.setHours(23, 59, 59, 999);
      }
    }

    const isAllAgencies = !params.agencyId || params.agencyId === 'all';

    // 1. Query DepositRequests
    const drRepo = this.dataSource.getRepository(DepositRequest);
    const drQuery = drRepo.createQueryBuilder('dr');

    if (!isAllAgencies) {
      drQuery.andWhere('dr.agencyId = :agencyId', { agencyId: params.agencyId });
    }
    if (start) {
      drQuery.andWhere('dr.createdAt >= :start', { start });
    }
    if (end) {
      drQuery.andWhere('dr.createdAt <= :end', { end });
    }

    const drResults = await drQuery
      .select('dr.type', 'type')
      .addSelect('dr.status', 'status')
      .addSelect('COUNT(dr.id)', 'count')
      .addSelect('COALESCE(SUM(CAST(dr.amount AS NUMERIC)), 0)', 'total')
      .groupBy('dr.type')
      .addGroupBy('dr.status')
      .getRawMany();

    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let pendingDeposits = 0;
    let pendingWithdrawals = 0;
    let pendingDepositsCount = 0;
    let pendingWithdrawalsCount = 0;

    let referralBonus = 0;
    let spinBonus = 0;
    let vipReward = 0;
    let promoBonus = 0;
    let adminCredit = 0;

    for (const row of drResults) {
      const type = row.type;
      const status = row.status;
      const count = parseInt(row.count, 10) || 0;
      const total = parseFloat(row.total) || 0;

      if (type === 'deposit') {
        if (status === 'approved') totalDeposits += total;
        if (status === 'pending') {
          pendingDeposits += total;
          pendingDepositsCount += count;
        }
      } else if (type === 'withdraw') {
        if (status === 'approved') totalWithdrawals += total;
        if (status === 'pending') {
          pendingWithdrawals += total;
          pendingWithdrawalsCount += count;
        }
      } else if (status === 'approved') {
        if (type === 'referral_bonus') referralBonus += total;
        else if (type === 'spin_bonus') spinBonus += total;
        else if (type === 'vip_reward') vipReward += total;
        else if (type === 'promo_bonus') promoBonus += total;
        else if (type === 'admin_credit') adminCredit += total;
      }
    }

    const totalBonusExpenses = referralBonus + spinBonus + vipReward + promoBonus + adminCredit;
    const netCashflow = totalDeposits - totalWithdrawals;

    // 2. Query GameBets (join user to get agencyId)
    const betRepo = this.dataSource.getRepository(GameBet);
    const betQuery = betRepo
      .createQueryBuilder('gb')
      .innerJoin('users', 'u', 'gb.userId = u.id');

    if (!isAllAgencies) {
      betQuery.andWhere('u.agencyId = :agencyId', { agencyId: params.agencyId });
    }
    if (start) {
      betQuery.andWhere('gb.placedAt >= :start', { start });
    }
    if (end) {
      betQuery.andWhere('gb.placedAt <= :end', { end });
    }

    const betResults = await betQuery
      .select('gb.status', 'status')
      .addSelect('COUNT(gb.id)', 'count')
      .addSelect('COALESCE(SUM(CAST(gb.amount AS NUMERIC)), 0)', 'totalBet')
      .addSelect('COALESCE(SUM(CAST(gb.payout AS NUMERIC)), 0)', 'totalPayout')
      .groupBy('gb.status')
      .getRawMany();

    let turnover = 0;
    let playerWins = 0;

    for (const row of betResults) {
      const betAmt = parseFloat(row.totalBet) || 0;
      const payout = parseFloat(row.totalPayout) || 0;
      turnover += betAmt;
      if (row.status === 'WON') {
        playerWins += payout;
      }
    }

    const ggr = turnover - playerWins;

    // 3. Agency breakdown comparison
    const allAgencies = await this.agenciesRepository.find({ order: { createdAt: 'ASC' } });
    const targetAgencies = isAllAgencies
      ? allAgencies
      : allAgencies.filter((a) => a.id === params.agencyId);

    // Group dr by agency
    const agencyDrQuery = drRepo.createQueryBuilder('dr');
    if (start) agencyDrQuery.andWhere('dr.createdAt >= :start', { start });
    if (end) agencyDrQuery.andWhere('dr.createdAt <= :end', { end });

    const agencyDrRows = await agencyDrQuery
      .select('dr.agencyId', 'agencyId')
      .addSelect('dr.type', 'type')
      .addSelect('dr.status', 'status')
      .addSelect('COALESCE(SUM(CAST(dr.amount AS NUMERIC)), 0)', 'total')
      .addSelect('COUNT(dr.id)', 'count')
      .groupBy('dr.agencyId')
      .addGroupBy('dr.type')
      .addGroupBy('dr.status')
      .getRawMany();

    // Group bets by agency
    const agencyBetQuery = betRepo
      .createQueryBuilder('gb')
      .innerJoin('users', 'u', 'gb.userId = u.id');
    if (start) agencyBetQuery.andWhere('gb.placedAt >= :start', { start });
    if (end) agencyBetQuery.andWhere('gb.placedAt <= :end', { end });

    const agencyBetRows = await agencyBetQuery
      .select('u.agencyId', 'agencyId')
      .addSelect('COALESCE(SUM(CAST(gb.amount AS NUMERIC)), 0)', 'turnover')
      .addSelect("COALESCE(SUM(CASE WHEN gb.status = 'WON' THEN CAST(gb.payout AS NUMERIC) ELSE 0 END), 0)", 'playerWins')
      .groupBy('u.agencyId')
      .getRawMany();

    // Count players per agency
    const userRepo = this.dataSource.getRepository(User);
    const userCountRows = await userRepo
      .createQueryBuilder('u')
      .select('u.agencyId', 'agencyId')
      .addSelect('COUNT(u.id)', 'count')
      .where('u.role = :role', { role: UserRole.USER })
      .groupBy('u.agencyId')
      .getRawMany();

    const agencyMap = new Map<string, any>();
    for (const a of targetAgencies) {
      agencyMap.set(a.id, {
        id: a.id,
        name: a.name,
        agencyCode: a.agencyCode,
        isActive: a.isActive,
        withdrawalChargeRate: a.withdrawalChargeRate,
        playerCount: 0,
        approvedDeposits: 0,
        approvedWithdrawals: 0,
        netCashflow: 0,
        pendingDepositsCount: 0,
        pendingWithdrawalsCount: 0,
        turnover: 0,
        playerWins: 0,
        ggr: 0,
        totalBonuses: 0,
      });
    }

    for (const u of userCountRows) {
      if (agencyMap.has(u.agencyId)) {
        agencyMap.get(u.agencyId).playerCount = parseInt(u.count, 10) || 0;
      }
    }

    for (const row of agencyDrRows) {
      const item = agencyMap.get(row.agencyId);
      if (!item) continue;
      const total = parseFloat(row.total) || 0;
      const count = parseInt(row.count, 10) || 0;
      if (row.type === 'deposit') {
        if (row.status === 'approved') item.approvedDeposits += total;
        if (row.status === 'pending') item.pendingDepositsCount += count;
      } else if (row.type === 'withdraw') {
        if (row.status === 'approved') item.approvedWithdrawals += total;
        if (row.status === 'pending') item.pendingWithdrawalsCount += count;
      } else if (row.status === 'approved') {
        item.totalBonuses += total;
      }
    }

    for (const row of agencyBetRows) {
      const item = agencyMap.get(row.agencyId);
      if (!item) continue;
      item.turnover += parseFloat(row.turnover) || 0;
      item.playerWins += parseFloat(row.playerWins) || 0;
    }

    const agencyBreakdown = Array.from(agencyMap.values()).map((a) => {
      a.netCashflow = a.approvedDeposits - a.approvedWithdrawals;
      a.ggr = a.turnover - a.playerWins;
      return {
        ...a,
        approvedDeposits: a.approvedDeposits.toFixed(2),
        approvedWithdrawals: a.approvedWithdrawals.toFixed(2),
        netCashflow: a.netCashflow.toFixed(2),
        turnover: a.turnover.toFixed(2),
        playerWins: a.playerWins.toFixed(2),
        ggr: a.ggr.toFixed(2),
        totalBonuses: a.totalBonuses.toFixed(2),
      };
    });

    const totalPlayersCount = Array.from(agencyMap.values()).reduce((acc, curr) => acc + curr.playerCount, 0);
    const activeAgenciesCount = allAgencies.filter((a) => a.isActive).length;

    return {
      summary: {
        totalDeposits: totalDeposits.toFixed(2),
        totalWithdrawals: totalWithdrawals.toFixed(2),
        netCashflow: netCashflow.toFixed(2),
        pendingDeposits: pendingDeposits.toFixed(2),
        pendingWithdrawals: pendingWithdrawals.toFixed(2),
        pendingDepositsCount,
        pendingWithdrawalsCount,
        turnover: turnover.toFixed(2),
        playerWins: playerWins.toFixed(2),
        ggr: ggr.toFixed(2),
        bonusExpenses: totalBonusExpenses.toFixed(2),
        activeAgenciesCount,
        totalAgenciesCount: allAgencies.length,
        totalPlayersCount,
      },
      bonusesBreakdown: {
        referral: referralBonus.toFixed(2),
        spin: spinBonus.toFixed(2),
        vip: vipReward.toFixed(2),
        promo: promoBonus.toFixed(2),
        adminCredit: adminCredit.toFixed(2),
      },
      agencies: agencyBreakdown,
    };
  }
}
