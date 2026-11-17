import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AgenciesService } from './agencies.service';
import { Agency } from './entities/agency.entity';
import { AgencyWalletNumber } from './entities/agency-wallet-number.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ReferralsService } from '../referrals/referrals.service';
import { UserRole } from '../common/enums/user-role.enum';
import * as bcrypt from 'bcryptjs';

describe('AgenciesService - Status Toggle & Money Flow Analytics', () => {
  let service: AgenciesService;
  let agenciesRepo: any;
  let walletNumbersRepo: any;
  let usersService: any;
  let dataSource: any;
  let mockUserRepo: any;
  let mockDrRepo: any;
  let mockBetRepo: any;

  const mockAgency: Agency = {
    id: 'agency-1',
    name: 'Super Elite Agency',
    agencyCode: 'ELITE01',
    bkashNumber: '01711111111',
    withdrawalChargeRate: '40',
    isActive: true,
    defaultReferralMode: 'lifetime',
    defaultMaxReferrals: 5,
    defaultResetWindowHours: 24,
    defaultReferralBonus: '10.00',
    isReferralEnabled: true,
    users: [],
    walletNumbers: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    agenciesRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
    };

    walletNumbersRepo = {
      find: jest.fn(),
    };

    usersService = {
      findByPhone: jest.fn(),
      findById: jest.fn(),
    };

    mockUserRepo = {
      update: jest.fn().mockResolvedValue({ affected: 5 }),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { agencyId: 'agency-1', count: '10' },
        ]),
      }),
    };

    mockDrRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: 'deposit', status: 'approved', count: '5', total: '5000.00' },
          { type: 'withdraw', status: 'approved', count: '2', total: '2000.00' },
          { type: 'deposit', status: 'pending', count: '1', total: '1000.00' },
          { type: 'withdraw', status: 'pending', count: '1', total: '500.00' },
          { type: 'referral_bonus', status: 'approved', count: '3', total: '150.00' },
          { type: 'spin_bonus', status: 'approved', count: '2', total: '50.00' },
        ]),
      }),
    };

    mockBetRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: 'WON', count: '4', totalBet: '400.00', totalPayout: '800.00' },
          { status: 'LOST', count: '6', totalBet: '600.00', totalPayout: '0.00' },
        ]),
      }),
    };

    dataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        const name = typeof entity === 'function' ? entity.name : entity;
        if (name === 'User') return mockUserRepo;
        if (name === 'DepositRequest') return mockDrRepo;
        if (name === 'GameBet') return mockBetRepo;
        return {};
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgenciesService,
        { provide: getRepositoryToken(Agency), useValue: agenciesRepo },
        { provide: getRepositoryToken(AgencyWalletNumber), useValue: walletNumbersRepo },
        { provide: UsersService, useValue: usersService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AgenciesService>(AgenciesService);
  });

  describe('toggleAgencyStatus', () => {
    it('successfully deactivates agency and updates its users', async () => {
      agenciesRepo.findOne.mockResolvedValue({ ...mockAgency, isActive: true });

      const updated = await service.toggleAgencyStatus('agency-1', false);

      expect(updated.isActive).toBe(false);
      expect(agenciesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'agency-1', isActive: false }),
      );
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        { agencyId: 'agency-1' },
        { isActive: false },
      );
    });

    it('successfully activates agency and its users', async () => {
      agenciesRepo.findOne.mockResolvedValue({ ...mockAgency, isActive: false });

      const updated = await service.toggleAgencyStatus('agency-1', true);

      expect(updated.isActive).toBe(true);
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        { agencyId: 'agency-1' },
        { isActive: true },
      );
    });

    it('throws NotFoundException when agency does not exist', async () => {
      agenciesRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleAgencyStatus('invalid-id', false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMoneyFlowAnalytics', () => {
    it('calculates money flow metrics, net cash flow, and GGR accurately', async () => {
      agenciesRepo.find.mockResolvedValue([mockAgency]);

      const analytics = await service.getMoneyFlowAnalytics({
        agencyId: 'all',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(analytics.summary).toBeDefined();
      expect(analytics.summary.totalDeposits).toBe('5000.00');
      expect(analytics.summary.totalWithdrawals).toBe('2000.00');
      expect(analytics.summary.netCashflow).toBe('3000.00');
      expect(analytics.summary.pendingDeposits).toBe('1000.00');
      expect(analytics.summary.pendingWithdrawals).toBe('500.00');
      expect(analytics.summary.pendingDepositsCount).toBe(1);
      expect(analytics.summary.pendingWithdrawalsCount).toBe(1);
      expect(analytics.summary.bonusExpenses).toBe('200.00'); // 150 ref + 50 spin
      expect(analytics.summary.turnover).toBe('1000.00'); // 400 won + 600 lost
      expect(analytics.summary.playerWins).toBe('800.00');
      expect(analytics.summary.ggr).toBe('200.00'); // 1000 - 800
      expect(analytics.bonusesBreakdown.referral).toBe('150.00');
      expect(analytics.bonusesBreakdown.spin).toBe('50.00');
      expect(analytics.agencies).toHaveLength(1);
      expect(analytics.agencies[0].name).toBe('Super Elite Agency');
    });
  });
});

describe('AuthService - Inactive Account & Agency Blocking', () => {
  let authService: AuthService;
  let usersService: any;
  let agenciesService: any;
  let jwtService: any;

  beforeEach(async () => {
    usersService = {
      findByPhone: jest.fn(),
    };
    agenciesService = {
      findById: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mock-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AgenciesService, useValue: agenciesService },
        { provide: JwtService, useValue: jwtService },
        { provide: ReferralsService, useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('rejects login with Bengali message when user account is inactive', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 10);
    usersService.findByPhone.mockResolvedValue({
      id: 'u-1',
      phone: '01700000000',
      password: hashedPassword,
      isActive: false, // inactive user
      role: UserRole.USER,
      agencyId: 'agency-1',
    });

    await expect(
      authService.login({ phone: '01700000000', password: 'secret123' }),
    ).rejects.toThrow(
      new UnauthorizedException(
        'আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। অনুগ্রহ করে এজেন্সির সাথে যোগাযোগ করুন।',
      ),
    );
  });

  it('rejects login with Bengali message when agency is inactive (for both user and agency admin)', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 10);
    usersService.findByPhone.mockResolvedValue({
      id: 'admin-1',
      phone: '01711111111',
      password: hashedPassword,
      isActive: true,
      role: UserRole.AGENCY_ADMIN,
      agencyId: 'agency-inactive',
      agency: { id: 'agency-inactive', isActive: false },
    });

    agenciesService.findById.mockResolvedValue({
      id: 'agency-inactive',
      isActive: false,
    });

    await expect(
      authService.login({ phone: '01711111111', password: 'secret123' }),
    ).rejects.toThrow(
      new UnauthorizedException(
        'আপনার এজেন্সিটি বর্তমানে নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।',
      ),
    );
  });
});
