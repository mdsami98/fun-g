import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VipService, VIP_TIERS } from './vip.service';
import { VipClaimRecord } from './entities/vip-claim.entity';
import { User } from '../users/entities/user.entity';
import { DepositRequest, DepositRequestStatus, WalletRequestType } from '../wallet/entities/deposit-request.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('VipService', () => {
  let service: VipService;
  let claimRepo: any;
  let userRepo: any;
  let depositRepo: any;
  let notificationsService: any;
  let dataSource: any;

  const mockUser: User = {
    id: 'user-uuid-1',
    phone: '01711111111',
    password: 'hash',
    name: 'Player',
    role: null as any,
    balance: '100.00',
    isActive: true,
    withdrawalPassword: null,
    agencyId: 'agency-uuid-1',
    agency: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    claimRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'claim-1', ...entity })),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    depositRepo = {
      find: jest.fn(),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => {
        const manager = {
          findOne: jest.fn().mockResolvedValue({ ...mockUser }),
          save: jest.fn((_cls, obj) => Promise.resolve(obj)),
          create: jest.fn((_cls, obj) => ({ id: 'new-id', ...obj })),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VipService,
        { provide: getRepositoryToken(VipClaimRecord), useValue: claimRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(DepositRequest), useValue: depositRepo },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<VipService>(VipService);
  });

  it('should return Bronze tier if user has 0 deposits', async () => {
    depositRepo.find.mockResolvedValue([]);

    const status = await service.getVipStatus('user-uuid-1');
    expect(status.currentTier.name).toBe('Bronze');
    expect(status.currentTier.level).toBe(1);
    expect(status.totalDeposited).toBe(0);
  });

  it('should calculate Silver tier when cumulative deposit is 2500', async () => {
    depositRepo.find.mockResolvedValue([
      { amount: '1500.00' },
      { amount: '1000.00' },
    ]);

    const status = await service.getVipStatus('user-uuid-1');
    expect(status.currentTier.name).toBe('Silver');
    expect(status.currentTier.level).toBe(2);
    expect(status.totalDeposited).toBe(2500);
  });

  it('should allow claiming Silver reward when unlocked and not yet claimed', async () => {
    depositRepo.find.mockResolvedValue([
      { amount: '2500.00' },
    ]);
    claimRepo.findOne.mockResolvedValue(null);

    const result = await service.claimReward('user-uuid-1', 2);
    expect(result.success).toBe(true);
    expect(result.tierName).toBe('Silver');
    expect(result.rewardAmount).toBe(50);
  });

  it('should reject claiming reward if already claimed', async () => {
    depositRepo.find.mockResolvedValue([
      { amount: '2500.00' },
    ]);
    claimRepo.findOne.mockResolvedValue({ id: 'existing-claim', tierLevel: 2 });

    await expect(service.claimReward('user-uuid-1', 2)).rejects.toThrow(
      BadRequestException,
    );
  });
});
