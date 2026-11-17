import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DailySpinService, SPIN_SLICES } from './daily-spin.service';
import { DailySpinRecord } from './entities/daily-spin.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('DailySpinService', () => {
  let service: DailySpinService;
  let spinRepo: any;
  let userRepo: any;
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
    spinRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'spin-1', ...entity })),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
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
        DailySpinService,
        { provide: getRepositoryToken(DailySpinRecord), useValue: spinRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<DailySpinService>(DailySpinService);
  });

  it('should allow spinning if user has never spun', async () => {
    spinRepo.findOne.mockResolvedValue(null);

    const status = await service.getSpinStatus('user-uuid-1');
    expect(status.canSpin).toBe(true);
    expect(status.cooldownRemainingMs).toBe(0);
  });

  it('should reject spin if user already spun less than 24 hours ago', async () => {
    const recentDate = new Date(Date.now() - 2 * 3600 * 1000); // 2 hours ago
    spinRepo.findOne.mockResolvedValue({
      id: 'spin-1',
      userId: 'user-uuid-1',
      spunAt: recentDate,
      rewardLabel: '৳৫',
      rewardAmount: '5.00',
    });

    const status = await service.getSpinStatus('user-uuid-1');
    expect(status.canSpin).toBe(false);
    expect(status.cooldownRemainingMs).toBeGreaterThan(0);

    await expect(service.executeSpin('user-uuid-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should execute spin and return prize when eligible', async () => {
    spinRepo.findOne.mockResolvedValue(null);

    const result = await service.executeSpin('user-uuid-1');
    expect(result.selectedSliceIndex).toBeGreaterThanOrEqual(0);
    expect(result.selectedSliceIndex).toBeLessThan(SPIN_SLICES.length);
    expect(result.prize).toBeDefined();
  });
});
