import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PromoCodesService } from './promo-codes.service';
import { PromoCode, PromoRewardType } from './entities/promo-code.entity';
import { UserPromoRedemption } from './entities/promo-redemption.entity';
import { User } from '../users/entities/user.entity';
import { DailySpinRecord } from '../daily-spin/entities/daily-spin.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../common/enums/user-role.enum';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PromoCodesService', () => {
  let service: PromoCodesService;
  let promoRepo: any;
  let redemptionRepo: any;
  let userRepo: any;
  let spinRepo: any;
  let notificationsService: any;
  let dataSource: any;

  const mockUser: Partial<User> = {
    id: 'user-1',
    agencyId: 'agency-1',
    balance: '100.00',
    name: 'Player One',
  };

  const mockPromo: Partial<PromoCode> = {
    id: 'promo-1',
    code: 'WELCOME50',
    agencyId: 'agency-1',
    rewardType: PromoRewardType.CASH,
    rewardAmount: '50.00',
    maxClaims: 100,
    totalClaimed: 10,
    expiresAt: null,
    isActive: true,
  };

  beforeEach(async () => {
    promoRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'promo-new' })),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      find: jest.fn(),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    redemptionRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'redemption-1' })),
      save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    spinRepo = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    notificationsService = {
      createNotification: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const manager = {
          create: jest.fn().mockImplementation((entityClass, dto) => ({ ...dto, id: 'mock-id' })),
          save: jest.fn().mockImplementation((entityClass, entity) => Promise.resolve(entity)),
          findOne: jest.fn().mockImplementation((entityClass, opts) => {
            if (entityClass === User) return Promise.resolve({ ...mockUser });
            return Promise.resolve(null);
          }),
          delete: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        return cb(manager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoCodesService,
        { provide: getRepositoryToken(PromoCode), useValue: promoRepo },
        { provide: getRepositoryToken(UserPromoRedemption), useValue: redemptionRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(DailySpinRecord), useValue: spinRepo },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PromoCodesService>(PromoCodesService);
  });

  describe('createPromoCode', () => {
    it('creates promo code with normalized uppercase code', async () => {
      promoRepo.findOne.mockResolvedValue(null);

      const result = await service.createPromoCode(
        { userId: 'admin-1', role: UserRole.AGENCY_ADMIN, agencyId: 'agency-1' },
        { code: ' friday50 ', rewardType: 'cash', rewardAmount: 50 },
      );

      expect(promoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FRIDAY50',
          agencyId: 'agency-1',
          rewardType: PromoRewardType.CASH,
          rewardAmount: '50.00',
        }),
      );
      expect(result.id).toBe('promo-new');
    });

    it('rejects invalid code characters', async () => {
      await expect(
        service.createPromoCode(
          { userId: 'admin-1', role: UserRole.AGENCY_ADMIN },
          { code: 'FRIDAY 50!', rewardType: 'cash', rewardAmount: 50 },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects duplicate code', async () => {
      promoRepo.findOne.mockResolvedValue(mockPromo);
      await expect(
        service.createPromoCode(
          { userId: 'admin-1', role: UserRole.AGENCY_ADMIN },
          { code: 'WELCOME50', rewardType: 'cash', rewardAmount: 50 },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('redeemPromoCode', () => {
    it('throws if promo code does not exist or is inactive', async () => {
      promoRepo.findOne.mockResolvedValue(null);
      await expect(service.redeemPromoCode('user-1', 'INVALID')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws if promo code has expired', async () => {
      promoRepo.findOne.mockResolvedValue({
        ...mockPromo,
        expiresAt: new Date(Date.now() - 10000), // Expired 10s ago
      });
      await expect(service.redeemPromoCode('user-1', 'WELCOME50')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws if promo code reached max claims', async () => {
      promoRepo.findOne.mockResolvedValue({
        ...mockPromo,
        maxClaims: 10,
        totalClaimed: 10,
      });
      await expect(service.redeemPromoCode('user-1', 'WELCOME50')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws if code belongs to a different agency', async () => {
      promoRepo.findOne.mockResolvedValue({
        ...mockPromo,
        agencyId: 'other-agency',
      });
      userRepo.findOne.mockResolvedValue({ ...mockUser, agencyId: 'agency-1' });

      await expect(service.redeemPromoCode('user-1', 'WELCOME50')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws if user already claimed this code', async () => {
      promoRepo.findOne.mockResolvedValue(mockPromo);
      userRepo.findOne.mockResolvedValue(mockUser);
      redemptionRepo.findOne.mockResolvedValue({ id: 'redemption-existing' });

      await expect(service.redeemPromoCode('user-1', 'WELCOME50')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('successfully redeems cash promo code and credits user balance', async () => {
      promoRepo.findOne.mockResolvedValue({ ...mockPromo });
      userRepo.findOne.mockResolvedValue(mockUser);
      redemptionRepo.findOne.mockResolvedValue(null);

      const result = await service.redeemPromoCode('user-1', 'WELCOME50');

      expect(result.success).toBe(true);
      expect(result.rewardType).toBe(PromoRewardType.CASH);
      expect(result.newBalance).toBe('150.00'); // 100 + 50
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });

    it('successfully redeems spin promo code and resets daily spin', async () => {
      promoRepo.findOne.mockResolvedValue({
        ...mockPromo,
        rewardType: PromoRewardType.SPIN,
      });
      userRepo.findOne.mockResolvedValue(mockUser);
      redemptionRepo.findOne.mockResolvedValue(null);

      const result = await service.redeemPromoCode('user-1', 'WELCOME50');

      expect(result.success).toBe(true);
      expect(result.rewardType).toBe(PromoRewardType.SPIN);
      expect(notificationsService.createNotification).toHaveBeenCalled();
    });
  });
});
