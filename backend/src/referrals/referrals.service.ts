import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { ReferralConfig, ReferralQuotaMode } from './entities/referral-config.entity';
import { ReferralHistory } from './entities/referral-history.entity';
import { User } from '../users/entities/user.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { WalletRequestType } from '../wallet/entities/deposit-request.entity';
import { UpdateReferralConfigDto } from './dto/update-referral-config.dto';
import { UpdateAgencyDefaultReferralDto } from './dto/update-agency-default-referral.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectRepository(ReferralConfig)
    private readonly configRepo: Repository<ReferralConfig>,
    @InjectRepository(ReferralHistory)
    private readonly historyRepo: Repository<ReferralHistory>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Agency)
    private readonly agenciesRepo: Repository<Agency>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /** Generates an alphanumeric referral code, e.g. REF-7K9M2 */
  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempts = 0; attempts < 10; attempts++) {
      let code = 'REF-';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.configRepo.findOne({ where: { referralCode: code } });
      if (!existing) return code;
    }
    return `REF-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  }

  /** Ensures every player has an initialized referral config */
  async ensureUserConfig(userId: string, agencyId?: string): Promise<ReferralConfig> {
    let config = await this.configRepo.findOne({
      where: { userId },
      relations: { agency: true },
    });

    if (config) {
      await this.checkAndResetWindow(config);
      return config;
    }

    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: { agency: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const effectiveAgencyId = agencyId || user.agencyId;
    if (!effectiveAgencyId) {
      throw new BadRequestException('User must belong to an agency to have referral permissions');
    }

    const agency = await this.agenciesRepo.findOne({ where: { id: effectiveAgencyId } });
    const defaultMode = (agency?.defaultReferralMode as ReferralQuotaMode) || ReferralQuotaMode.LIFETIME;
    const defaultMax = agency?.defaultMaxReferrals ?? 5;
    const defaultReset = agency?.defaultResetWindowHours ?? 24;
    const defaultBonus = agency?.defaultReferralBonus ?? '10.00';
    const defaultActive = agency?.isReferralEnabled ?? true;

    const referralCode = await this.generateUniqueCode();
    config = this.configRepo.create({
      userId,
      agencyId: effectiveAgencyId,
      referralCode,
      mode: defaultMode,
      maxReferrals: defaultMax,
      resetWindowHours: defaultReset,
      bonusAmount: defaultBonus,
      currentWindowStart: new Date(),
      currentWindowCount: 0,
      totalLifetimeCount: 0,
      isActive: defaultActive,
    });

    return this.configRepo.save(config);
  }

  /** Resets window count if window elapsed */
  private async checkAndResetWindow(
    config: ReferralConfig,
    manager?: EntityManager,
  ): Promise<boolean> {
    if (config.mode !== ReferralQuotaMode.WINDOW || !config.resetWindowHours || config.resetWindowHours <= 0) {
      return false;
    }

    const windowDurationMs = config.resetWindowHours * 3600 * 1000;
    const now = Date.now();
    const windowStart = new Date(config.currentWindowStart).getTime();

    if (now - windowStart >= windowDurationMs) {
      config.currentWindowCount = 0;
      config.currentWindowStart = new Date(now);
      if (manager) {
        await manager.save(ReferralConfig, config);
      } else {
        await this.configRepo.save(config);
      }
      return true;
    }

    return false;
  }

  /** Validates referral code before registration */
  async validateReferralCode(rawCode: string): Promise<{
    config: ReferralConfig;
    referrer: User;
    agency: Agency;
    remainingQuota: number;
  }> {
    const code = rawCode.trim().toUpperCase();
    const config = await this.configRepo.findOne({
      where: { referralCode: code },
      relations: { user: true, agency: true },
    });

    if (!config) {
      throw new BadRequestException('Invalid referral code');
    }

    if (!config.isActive) {
      throw new BadRequestException('This referral link has been deactivated');
    }

    await this.checkAndResetWindow(config);

    if (config.mode === ReferralQuotaMode.LIFETIME) {
      if (config.totalLifetimeCount >= config.maxReferrals) {
        throw new BadRequestException(
          'This referral invitation link has reached its maximum quota and is no longer valid.',
        );
      }
    } else if (config.mode === ReferralQuotaMode.WINDOW) {
      if (config.currentWindowCount >= config.maxReferrals) {
        const nextReset = new Date(
          new Date(config.currentWindowStart).getTime() + config.resetWindowHours * 3600 * 1000,
        );
        throw new BadRequestException(
          `This referral invitation link has reached its limit for the current time frame. Quota resets at ${nextReset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        );
      }
    }

    const remainingQuota =
      config.mode === ReferralQuotaMode.LIFETIME
        ? Math.max(0, config.maxReferrals - config.totalLifetimeCount)
        : Math.max(0, config.maxReferrals - config.currentWindowCount);

    return {
      config,
      referrer: config.user,
      agency: config.agency,
      remainingQuota,
    };
  }

  /** Processes the referral reward within the registration transaction */
  async processReferralReward(
    code: string,
    newUserId: string,
    manager: EntityManager,
  ): Promise<void> {
    const normalizedCode = code.trim().toUpperCase();
    const config = await manager.findOne(ReferralConfig, {
      where: { referralCode: normalizedCode },
      lock: { mode: 'pessimistic_write' },
    });

    if (!config || !config.isActive) return;

    await this.checkAndResetWindow(config, manager);

    // Verify limit again under lock
    if (config.mode === ReferralQuotaMode.LIFETIME && config.totalLifetimeCount >= config.maxReferrals) {
      throw new BadRequestException('Referral quota exceeded');
    }
    if (config.mode === ReferralQuotaMode.WINDOW && config.currentWindowCount >= config.maxReferrals) {
      throw new BadRequestException('Referral quota for current window exceeded');
    }

    // Increment counters
    config.currentWindowCount += 1;
    config.totalLifetimeCount += 1;
    await manager.save(ReferralConfig, config);

    // Credit referrer balance
    const referrer = await manager.findOne(User, {
      where: { id: config.userId },
      lock: { mode: 'pessimistic_write' },
    });

    if (referrer) {
      const bonus = new Decimal(config.bonusAmount || '10.00');
      const balanceBefore = new Decimal(referrer.balance || 0);
      const balanceAfter = balanceBefore.plus(bonus);

      referrer.balance = balanceAfter.toFixed(2);
      await manager.save(User, referrer);

      const txId = `REF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const historyTx = manager.create(WalletTransaction, {
        userId: referrer.id,
        agencyId: config.agencyId,
        type: WalletRequestType.REFERRAL_BONUS,
        amount: bonus.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        provider: null,
        transactionId: txId,
        requestId: null,
      });
      await manager.save(WalletTransaction, historyTx);
    }

    // Save referral history record
    const historyEntry = manager.create(ReferralHistory, {
      referrerId: config.userId,
      referredUserId: newUserId,
      agencyId: config.agencyId,
      referralCode: config.referralCode,
      bonusAmount: config.bonusAmount,
    });
    await manager.save(ReferralHistory, historyEntry);

    // Send in-app notification to referrer
    await this.notificationsService.createNotification(
      config.userId,
      '🎁 রেফারেল বোনাস অর্জিত!',
      `অভিনন্দন! আপনার রেফারেল লিংক ব্যবহার করে বন্ধু জয়েন করায় আপনার ওয়ালেটে ৳${config.bonusAmount} ক্যাশ বোনাস যোগ করা হয়েছে।`,
      NotificationType.REFERRAL_BONUS,
      { amount: config.bonusAmount, referralCode: config.referralCode },
      manager,
    );
  }

  /** Player Referral Portal Dashboard */
  async getUserReferralDashboard(userId: string) {
    const config = await this.ensureUserConfig(userId);
    await this.checkAndResetWindow(config);

    const history = await this.historyRepo.find({
      where: { referrerId: userId },
      relations: { referredUser: true },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    const remainingQuota =
      config.mode === ReferralQuotaMode.LIFETIME
        ? Math.max(0, config.maxReferrals - config.totalLifetimeCount)
        : Math.max(0, config.maxReferrals - config.currentWindowCount);

    let nextResetAt: string | null = null;
    if (config.mode === ReferralQuotaMode.WINDOW && config.resetWindowHours > 0) {
      nextResetAt = new Date(
        new Date(config.currentWindowStart).getTime() + config.resetWindowHours * 3600 * 1000,
      ).toISOString();
    }

    return {
      referralCode: config.referralCode,
      mode: config.mode,
      maxReferrals: config.maxReferrals,
      resetWindowHours: config.resetWindowHours,
      bonusAmount: config.bonusAmount,
      currentWindowCount: config.currentWindowCount,
      totalLifetimeCount: config.totalLifetimeCount,
      remainingQuota,
      nextResetAt,
      isActive: config.isActive,
      referredUsers: history.map((h) => ({
        id: h.id,
        name: h.referredUser?.name ?? 'Player',
        phone: h.referredUser?.phone
          ? h.referredUser.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
          : '****',
        bonusAmount: h.bonusAmount,
        createdAt: h.createdAt,
      })),
    };
  }

  /** Generates a fresh referral code for the user */
  async regenerateReferralCode(userId: string): Promise<{ referralCode: string }> {
    const config = await this.ensureUserConfig(userId);
    const newCode = await this.generateUniqueCode();
    config.referralCode = newCode;
    await this.configRepo.save(config);
    return { referralCode: newCode };
  }

  /** Agency Admin: View player referral config */
  async getAgencyUserReferralConfig(agencyId: string, userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId, agencyId } });
    if (!user) {
      throw new NotFoundException('User not found in this agency');
    }

    const config = await this.ensureUserConfig(userId, agencyId);
    await this.checkAndResetWindow(config);

    const history = await this.historyRepo.find({
      where: { referrerId: userId },
      relations: { referredUser: true },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
      config,
      history: history.map((h) => ({
        id: h.id,
        referredUserName: h.referredUser?.name ?? 'Player',
        referredUserPhone: h.referredUser?.phone ?? '—',
        bonusAmount: h.bonusAmount,
        createdAt: h.createdAt,
      })),
    };
  }

  /** Agency Admin: Customize player referral rules */
  async updateAgencyUserReferralConfig(
    agencyId: string,
    userId: string,
    dto: UpdateReferralConfigDto,
  ): Promise<ReferralConfig> {
    const user = await this.usersRepo.findOne({ where: { id: userId, agencyId } });
    if (!user) {
      throw new NotFoundException('User not found in this agency');
    }

    const config = await this.ensureUserConfig(userId, agencyId);

    if (dto.mode !== undefined) config.mode = dto.mode;
    if (dto.maxReferrals !== undefined) config.maxReferrals = dto.maxReferrals;
    if (dto.resetWindowHours !== undefined) config.resetWindowHours = dto.resetWindowHours;
    if (dto.bonusAmount !== undefined) config.bonusAmount = new Decimal(dto.bonusAmount).toFixed(2);
    if (dto.isActive !== undefined) config.isActive = dto.isActive;

    // If changing to window mode, reset window start
    if (dto.mode === ReferralQuotaMode.WINDOW) {
      config.currentWindowStart = new Date();
      config.currentWindowCount = 0;
    }

    return this.configRepo.save(config);
  }

  /** Agency Admin: View agency-wide referral history */
  async getAgencyReferralHistory(agencyId: string, page = 1, limit = 20) {
    const [items, total] = await this.historyRepo.findAndCount({
      where: { agencyId },
      relations: { referrer: true, referredUser: true },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      items: items.map((h) => ({
        id: h.id,
        referrerName: h.referrer?.name ?? '—',
        referrerPhone: h.referrer?.phone ?? '—',
        referredName: h.referredUser?.name ?? '—',
        referredPhone: h.referredUser?.phone ?? '—',
        referralCode: h.referralCode,
        bonusAmount: h.bonusAmount,
        createdAt: h.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  /** Agency Admin: Get Agency-wide Default Referral Policy */
  async getAgencyDefaultReferralConfig(agencyId: string) {
    const agency = await this.agenciesRepo.findOne({ where: { id: agencyId } });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    return {
      agencyId: agency.id,
      agencyName: agency.name,
      agencyCode: agency.agencyCode,
      defaultReferralMode: (agency.defaultReferralMode as ReferralQuotaMode) || ReferralQuotaMode.LIFETIME,
      defaultMaxReferrals: agency.defaultMaxReferrals ?? 5,
      defaultResetWindowHours: agency.defaultResetWindowHours ?? 24,
      defaultReferralBonus: agency.defaultReferralBonus ?? '10.00',
      isReferralEnabled: agency.isReferralEnabled ?? true,
    };
  }

  /** Agency Admin: Update Agency-wide Default Referral Policy */
  async updateAgencyDefaultReferralConfig(
    agencyId: string,
    dto: UpdateAgencyDefaultReferralDto,
  ) {
    const agency = await this.agenciesRepo.findOne({ where: { id: agencyId } });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    if (dto.defaultReferralMode !== undefined) {
      agency.defaultReferralMode = dto.defaultReferralMode;
    }
    if (dto.defaultMaxReferrals !== undefined) {
      agency.defaultMaxReferrals = dto.defaultMaxReferrals;
    }
    if (dto.defaultResetWindowHours !== undefined) {
      agency.defaultResetWindowHours = dto.defaultResetWindowHours;
    }
    if (dto.defaultReferralBonus !== undefined) {
      agency.defaultReferralBonus = new Decimal(dto.defaultReferralBonus).toFixed(2);
    }
    if (dto.isReferralEnabled !== undefined) {
      agency.isReferralEnabled = dto.isReferralEnabled;
    }

    await this.agenciesRepo.save(agency);

    // If syncToExistingUsers is selected, propagate changes to all existing users in this agency
    if (dto.syncToExistingUsers) {
      const updateData: Partial<ReferralConfig> = {};
      if (dto.defaultReferralMode !== undefined) updateData.mode = dto.defaultReferralMode;
      if (dto.defaultMaxReferrals !== undefined) updateData.maxReferrals = dto.defaultMaxReferrals;
      if (dto.defaultResetWindowHours !== undefined) updateData.resetWindowHours = dto.defaultResetWindowHours;
      if (dto.defaultReferralBonus !== undefined) updateData.bonusAmount = new Decimal(dto.defaultReferralBonus).toFixed(2);
      if (dto.isReferralEnabled !== undefined) updateData.isActive = dto.isReferralEnabled;

      if (Object.keys(updateData).length > 0) {
        await this.configRepo.update({ agencyId }, updateData);
      }
    }

    return this.getAgencyDefaultReferralConfig(agencyId);
  }
}
