import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { WalletService } from './wallet.service';
import { DepositRequest } from './entities/deposit-request.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import {
  AgencyWalletNumber,
  WalletProvider,
} from '../agencies/entities/agency-wallet-number.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { User } from '../users/entities/user.entity';
import { UserRestriction } from '../users/entities/user-restriction.entity';
import { UserWithdrawalAccount } from './entities/user-withdrawal-account.entity';

describe('WalletService - Withdrawal Account Setup & Restriction', () => {
  let service: WalletService;
  let usersRepo: any;
  let userRestrictionsRepo: any;
  let withdrawalAccountsRepo: any;

  const mockUser: any = {
    id: 'user-uuid-1',
    phone: '01711111111',
    password: 'hash',
    name: 'Rahim Khan',
    balance: '500.00',
    withdrawalPassword: null,
  };

  beforeEach(async () => {
    usersRepo = {
      findOne: jest.fn(),
      save: jest.fn((u) => Promise.resolve(u)),
      createQueryBuilder: jest.fn(() => ({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ ...mockUser }),
      })),
    };

    withdrawalAccountsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((e) => Promise.resolve({ id: '1', ...e })),
    };

    userRestrictionsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(DepositRequest),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(AgencyWalletNumber),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Agency),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepo,
        },
        {
          provide: getRepositoryToken(UserRestriction),
          useValue: userRestrictionsRepo,
        },
        {
          provide: getRepositoryToken(UserWithdrawalAccount),
          useValue: withdrawalAccountsRepo,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (cb) => {
              const manager = {
                findOne: jest.fn().mockResolvedValue({ ...mockUser, balance: '500.00' }),
                save: jest.fn((_cls, obj) => Promise.resolve(obj)),
                create: jest.fn((_cls, obj) => ({ id: 'new-id', ...obj })),
              };
              return cb(manager);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  it('should throw BadRequestException if passwords do not match', async () => {
    await expect(
      service.setupWithdrawalAccount('user-uuid-1', {
        provider: WalletProvider.BKASH,
        accountNumber: '01712345678',
        accountGroup: 'Personal',
        withdrawalPassword: 'pass1',
        confirmPassword: 'pass2',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should hash and save withdrawal password on first setup', async () => {
    mockUser.withdrawalPassword = null;
    withdrawalAccountsRepo.findOne.mockResolvedValue(null);

    const result = await service.setupWithdrawalAccount('user-uuid-1', {
      provider: WalletProvider.BKASH,
      accountNumber: '01712345678',
      accountGroup: 'Personal',
      withdrawalPassword: 'secretpassword',
      confirmPassword: 'secretpassword',
    });

    expect(result.accountNumber).toBe('01712345678');
    expect(result.provider).toBe(WalletProvider.BKASH);
    expect(usersRepo.save).toHaveBeenCalled();
  });

  it('should reject setup if existing withdrawal password does not match', async () => {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('correctpass', salt);

    usersRepo.createQueryBuilder = jest.fn(() => ({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        ...mockUser,
        withdrawalPassword: hashed,
      }),
    }));

    await expect(
      service.setupWithdrawalAccount('user-uuid-1', {
        provider: WalletProvider.NAGAD,
        accountNumber: '01812345678',
        accountGroup: 'Personal',
        withdrawalPassword: 'wrongpass',
        confirmPassword: 'wrongpass',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return list of withdrawal accounts for user', async () => {
    withdrawalAccountsRepo.find.mockResolvedValue([
      { id: '1', provider: WalletProvider.BKASH, accountNumber: '01712345678' },
    ]);

    const accounts = await service.getUserWithdrawalAccounts('user-uuid-1');
    expect(accounts).toHaveLength(1);
    expect(accounts[0].provider).toBe(WalletProvider.BKASH);
  });

  it('should block withdrawal and return latest restriction message when user is restricted', async () => {
    const mockRestriction = {
      id: 'res-1',
      userId: 'user-uuid-1',
      message: 'Withdrawal suspended due to suspicious activity',
      createdAt: new Date(),
    };
    userRestrictionsRepo.findOne.mockResolvedValue(mockRestriction);

    try {
      await service.createWithdrawalRequest('user-uuid-1', 'agency-1', {
        provider: WalletProvider.BKASH,
        accountNumber: '01712345678',
        amount: '100',
        withdrawalPassword: 'anypassword',
      });
      fail('Should have thrown BadRequestException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(BadRequestException);
      const res = err.getResponse();
      expect(res.isRestricted).toBe(true);
      expect(res.message).toBe('Withdrawal suspended due to suspicious activity');
    }
  });

  it('should allow withdrawal when user has no restriction', async () => {
    userRestrictionsRepo.findOne.mockResolvedValue(null);

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('mypassword', salt);

    usersRepo.createQueryBuilder = jest.fn(() => ({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        ...mockUser,
        agencyId: 'agency-1',
        balance: '500.00',
        withdrawalPassword: hashed,
      }),
    }));

    withdrawalAccountsRepo.findOne.mockResolvedValue({
      id: 'acc-1',
      userId: 'user-uuid-1',
      provider: WalletProvider.BKASH,
      accountNumber: '01712345678',
    });

    const result = await service.createWithdrawalRequest('user-uuid-1', 'agency-1', {
      provider: WalletProvider.BKASH,
      accountNumber: '01712345678',
      amount: '100',
      withdrawalPassword: 'mypassword',
    });

    expect(result.success).toBe(true);
    expect(result.balance).toBe('400.00');
    expect(result.request).toBeDefined();
  });
});
