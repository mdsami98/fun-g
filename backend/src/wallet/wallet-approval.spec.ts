import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('WalletService - Approval & History', () => {
  let service: WalletService;
  let depositRequestsRepo: any;
  let walletTransactionsRepo: any;
  let walletNumbersRepo: any;
  let agenciesRepo: any;
  let usersRepo: any;
  let dataSource: any;

  const mockUser: User = {
    id: 'user-uuid-1',
    phone: '01711111111',
    password: 'hash',
    name: 'Rahim Khan',
    role: UserRole.USER,
    agencyId: 'agency-uuid-1',
    agency: null,
    balance: '250.00',
    withdrawalPassword: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest: DepositRequest = {
    id: '1',
    type: WalletRequestType.DEPOSIT,
    userId: 'user-uuid-1',
    user: mockUser,
    agencyId: 'agency-uuid-1',
    agency: null as any,
    walletNumberId: '10',
    walletNumber: null,
    provider: WalletProvider.BKASH,
    amount: '500.00',
    transactionId: 'TRX123456',
    status: DepositRequestStatus.PENDING,
    reviewedById: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    depositRequestsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((e) => Promise.resolve(e)),
      count: jest.fn().mockResolvedValue(1),
    };
    walletTransactionsRepo = {
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((e) => Promise.resolve({ id: '1', ...e })),
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
      save: jest.fn((e) => Promise.resolve(e)),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => {
        const manager = {
          findOne: jest.fn(async (entityClass, opts) => {
            if (entityClass === DepositRequest) {
              return { ...mockRequest };
            }
            if (entityClass === User) {
              return { ...mockUser };
            }
            return null;
          }),
          save: jest.fn(async (_entityClass, entity) => entity),
          create: jest.fn((_entityClass, dto) => dto),
        };
        return cb(manager);
      }),
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
            findOne: jest.fn(),
            find: jest.fn(),
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
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('getUserRequests', () => {
    it('returns requests for a user ordered by date', async () => {
      depositRequestsRepo.find.mockResolvedValue([mockRequest]);
      const result = await service.getUserRequests('user-uuid-1');
      expect(result).toEqual([mockRequest]);
      expect(depositRequestsRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('approveDepositRequest', () => {
    it('approves request, increments balance, and records history', async () => {
      const result = await service.approveDepositRequest(
        'admin-uuid-1',
        'agency-uuid-1',
        '1',
      );

      expect(result.success).toBe(true);
      expect(result.request.status).toBe(DepositRequestStatus.APPROVED);
      expect(result.request.reviewedById).toBe('admin-uuid-1');
      // Initial 250.00 + deposit 500.00 = 750.00
      expect(result.balance).toBe('750.00');
    });
  });

  describe('rejectDepositRequest', () => {
    it('rejects request without modifying balance', async () => {
      depositRequestsRepo.findOne.mockResolvedValue({ ...mockRequest });
      const result = await service.rejectDepositRequest(
        'admin-uuid-1',
        'agency-uuid-1',
        '1',
      );

      expect(result.status).toBe(DepositRequestStatus.REJECTED);
      expect(result.reviewedById).toBe('admin-uuid-1');
      expect(depositRequestsRepo.save).toHaveBeenCalled();
    });

    it('throws error if request already processed', async () => {
      depositRequestsRepo.findOne.mockResolvedValue({
        ...mockRequest,
        status: DepositRequestStatus.APPROVED,
      });

      await expect(
        service.rejectDepositRequest('admin-uuid-1', 'agency-uuid-1', '1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
