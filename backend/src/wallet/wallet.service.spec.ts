import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletService } from './wallet.service';
import {
  DepositRequest,
  DepositRequestStatus,
  WalletRequestType,
} from './entities/deposit-request.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import {
  AgencyWalletNumber,
  WalletAccountType,
  WalletProvider,
} from '../agencies/entities/agency-wallet-number.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { User } from '../users/entities/user.entity';
import { UserRestriction } from '../users/entities/user-restriction.entity';
import { UserWithdrawalAccount } from './entities/user-withdrawal-account.entity';

describe('WalletService', () => {
  let service: WalletService;
  let depositRequestsRepo: any;
  let walletTransactionsRepo: any;
  let walletNumbersRepo: any;
  let agenciesRepo: any;
  let usersRepo: any;
  let dataSource: any;

  const mockAgency: Agency = {
    id: 'agency-uuid-1',
    name: 'Dhaka Agency',
    agencyCode: 'DHAKA01',
    bkashNumber: '01700000000',
    withdrawalChargeRate: '40',
    isActive: true,
    users: [],
    walletNumbers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWalletNumber: AgencyWalletNumber = {
    id: '1',
    agencyId: 'agency-uuid-1',
    agency: mockAgency,
    provider: WalletProvider.BKASH,
    number: '01711111111',
    accountType: WalletAccountType.AGENT,
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    depositRequestsRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) =>
        Promise.resolve({ id: '100', ...entity, createdAt: new Date() }),
      ),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    walletTransactionsRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    walletNumbersRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    agenciesRepo = {
      findOne: jest.fn(),
    };

    usersRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(DepositRequest),
          useValue: depositRequestsRepo,
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: walletTransactionsRepo,
        },
        {
          provide: getRepositoryToken(AgencyWalletNumber),
          useValue: walletNumbersRepo,
        },
        {
          provide: getRepositoryToken(Agency),
          useValue: agenciesRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepo,
        },
        {
          provide: getRepositoryToken(UserRestriction),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserWithdrawalAccount),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((dto) => dto),
            save: jest.fn((e) => Promise.resolve({ id: '1', ...e })),
          },
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('getDepositMethods', () => {
    it('returns empty array if user has no agencyId', async () => {
      const result = await service.getDepositMethods(null);
      expect(result).toEqual([]);
    });

    it('returns active wallet numbers for agency', async () => {
      walletNumbersRepo.find.mockResolvedValue([mockWalletNumber]);
      const result = await service.getDepositMethods('agency-uuid-1');
      expect(result).toEqual([mockWalletNumber]);
      expect(walletNumbersRepo.find).toHaveBeenCalledWith({
        where: { agencyId: 'agency-uuid-1', isActive: true },
        order: { id: 'ASC' },
      });
    });
  });

  describe('createDepositRequest', () => {
    it('throws error if user has no agencyId', async () => {
      await expect(
        service.createDepositRequest('user-1', null, {
          provider: WalletProvider.BKASH,
          amount: 500,
          transactionId: 'TRX123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws error if agency is inactive', async () => {
      agenciesRepo.findOne.mockResolvedValue({ ...mockAgency, isActive: false });
      await expect(
        service.createDepositRequest('user-1', 'agency-uuid-1', {
          provider: WalletProvider.BKASH,
          amount: 500,
          transactionId: 'TRX123456',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates and saves deposit request successfully', async () => {
      agenciesRepo.findOne.mockResolvedValue(mockAgency);
      walletNumbersRepo.findOne.mockResolvedValue(mockWalletNumber);

      const result = await service.createDepositRequest(
        'user-1',
        'agency-uuid-1',
        {
          provider: WalletProvider.BKASH,
          amount: 1000,
          transactionId: 'BL69X9ABC',
        },
      );

      expect(depositRequestsRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        agencyId: 'agency-uuid-1',
        walletNumberId: '1',
        provider: WalletProvider.BKASH,
        amount: '1000.00',
        transactionId: 'BL69X9ABC',
        status: DepositRequestStatus.PENDING,
        type: WalletRequestType.DEPOSIT,
      });
      expect(result.id).toBe('100');
      expect(result.status).toBe(DepositRequestStatus.PENDING);
    });
  });
});
