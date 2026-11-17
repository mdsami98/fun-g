import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReferralsService } from './referrals.service';
import { ReferralConfig, ReferralQuotaMode } from './entities/referral-config.entity';
import { ReferralHistory } from './entities/referral-history.entity';
import { User } from '../users/entities/user.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('ReferralsService', () => {
  let service: ReferralsService;
  let configRepo: any;
  let historyRepo: any;
  let userRepo: any;
  let agencyRepo: any;
  let dataSource: any;

  const mockUser: User = {
    id: 'user-uuid-1',
    phone: '01711111111',
    password: 'hash',
    name: 'Referrer User',
    role: UserRole.USER,
    balance: '100.00',
    totalDeposited: '0.00',
    totalWithdrawn: '0.00',
    isActive: true,
    isBettingRestricted: false,
    withdrawalPassword: null,
    agencyId: 'agency-uuid-1',
    agency: null as any,
    walletRequests: [],
    walletTransactions: [],
    gameBets: [],
    referralConfig: null as any,
    referralsGiven: [],
    referredByHistory: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConfig: ReferralConfig = {
    id: 'config-uuid-1',
    userId: 'user-uuid-1',
    user: mockUser,
    agencyId: 'agency-uuid-1',
    agency: null as any,
    referralCode: 'REF12345',
    mode: ReferralQuotaMode.LIFETIME,
    maxReferrals: 5,
    resetWindowHours: 24,
    bonusAmount: '10.00',
    currentWindowStart: new Date(),
    currentWindowCount: 0,
    totalLifetimeCount: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    configRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };

    historyRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'history-uuid-1', ...entity })),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };

    agencyRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve({ ...entity })),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => {
        const fakeManager = {
          save: jest.fn((entity) => Promise.resolve(entity)),
          create: jest.fn((_, dto) => ({ ...dto })),
        };
        return cb(fakeManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: getRepositoryToken(ReferralConfig), useValue: configRepo },
        { provide: getRepositoryToken(ReferralHistory), useValue: historyRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Agency), useValue: agencyRepo },
        { provide: DataSource, useValue: dataSource },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
          },
        },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  it('should validate referral code successfully when quota is available', async () => {
    configRepo.findOne.mockResolvedValue({
      ...mockConfig,
      totalLifetimeCount: 2,
    });

    const result = await service.validateReferralCode('REF12345');
    expect(result.config.referralCode).toBe('REF12345');
    expect(result.remainingQuota).toBe(3);
  });

  it('should throw BadRequestException when lifetime referral quota is reached', async () => {
    configRepo.findOne.mockResolvedValue({
      ...mockConfig,
      totalLifetimeCount: 5,
      maxReferrals: 5,
    });

    await expect(service.validateReferralCode('REF12345')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException when timeframe referral quota is reached', async () => {
    configRepo.findOne.mockResolvedValue({
      ...mockConfig,
      mode: ReferralQuotaMode.WINDOW,
      currentWindowCount: 3,
      maxReferrals: 3,
      currentWindowStart: new Date(),
      resetWindowHours: 24,
    });

    await expect(service.validateReferralCode('REF12345')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should credit bonus to referrer wallet and record history on successful registration', async () => {
    const mockManager: any = {
      findOne: jest.fn().mockImplementation((entityClass) => {
        if (entityClass === ReferralConfig) {
          return Promise.resolve({
            ...mockConfig,
            currentWindowCount: 0,
            totalLifetimeCount: 0,
          });
        }
        if (entityClass === User) {
          return Promise.resolve({
            ...mockUser,
            balance: '50.00',
          });
        }
        return Promise.resolve(null);
      }),
      save: jest.fn().mockImplementation((_, entity) => Promise.resolve(entity)),
      create: jest.fn().mockImplementation((_, dto) => ({ ...dto })),
    };

    await service.processReferralReward('REF12345', 'new-user-uuid', mockManager);

    expect(mockManager.save).toHaveBeenCalled();
  });
});
