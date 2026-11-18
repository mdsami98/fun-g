import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { PromoCode, PromoRewardType } from './entities/promo-code.entity';
import { UserPromoRedemption } from './entities/promo-redemption.entity';
import { User } from '../users/entities/user.entity';
import { DailySpinRecord } from '../daily-spin/entities/daily-spin.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { WalletRequestType } from '../wallet/entities/deposit-request.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';

export { CreatePromoCodeDto };


@Injectable()
export class PromoCodesService {
  constructor(
    @InjectRepository(PromoCode)
    private readonly promoRepo: Repository<PromoCode>,
    @InjectRepository(UserPromoRedemption)
    private readonly redemptionRepo: Repository<UserPromoRedemption>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DailySpinRecord)
    private readonly spinRepo: Repository<DailySpinRecord>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /** Agency Admin or Super Admin creates a new promo code */
  async createPromoCode(
    creator: { userId: string; role: string; agencyId?: string | null },
    dto: CreatePromoCodeDto,
  ): Promise<PromoCode> {
    const rawCode = dto.code ? dto.code.trim().toUpperCase() : '';
    if (!rawCode || rawCode.length < 3 || rawCode.length > 32) {
      throw new BadRequestException('প্রোমো কোড ৩ থেকে ৩২ অক্ষরের হতে হবে।');
    }

    // Check code regex (alphanumeric and dashes/underscores)
    if (!/^[A-Z0-9_-]+$/.test(rawCode)) {
      throw new BadRequestException('প্রোমো কোডে শুধুমাত্র ইংরেজি অক্ষর ও সংখ্যা ব্যবহার করা যাবে।');
    }

    const existing = await this.promoRepo.findOne({ where: { code: rawCode } });
    if (existing) {
      throw new BadRequestException('এই প্রোমো কোডটি ইতিমধ্যে ব্যবহৃত হচ্ছে। অন্য কোনো কোড দিন।');
    }

    const rewardType = dto.rewardType === 'spin' ? PromoRewardType.SPIN : PromoRewardType.CASH;
    let rewardAmount = '0.00';

    if (rewardType === PromoRewardType.CASH) {
      const amount = Number(dto.rewardAmount || 0);
      if (amount <= 0) {
        throw new BadRequestException('ক্যাশ রিওয়ার্ডের পরিমাণ ০ এর বেশি হতে হবে।');
      }
      rewardAmount = amount.toFixed(2);
    }

    const isSuperAdmin = creator.role === UserRole.SUPER_ADMIN;
    const agencyId = isSuperAdmin ? null : creator.agencyId || null;

    const promo = this.promoRepo.create({
      code: rawCode,
      agencyId,
      rewardType,
      rewardAmount,
      maxClaims: dto.maxClaims ? Number(dto.maxClaims) : null,
      totalClaimed: 0,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: true,
    });

    return this.promoRepo.save(promo);
  }

  /** Lists promo codes for an agency */
  async getAgencyPromoCodes(agencyId: string | null): Promise<PromoCode[]> {
    if (!agencyId) {
      return this.promoRepo.find({ order: { createdAt: 'DESC' } });
    }
    return this.promoRepo.find({
      where: [{ agencyId }, { agencyId: null as any }],
      order: { createdAt: 'DESC' },
    });
  }

  /** Toggles active status of a promo code */
  async togglePromoCodeStatus(
    creator: { role: string; agencyId?: string | null },
    codeId: string,
    isActive: boolean,
  ): Promise<PromoCode> {
    const promo = await this.promoRepo.findOne({ where: { id: codeId } });
    if (!promo) {
      throw new NotFoundException('প্রোমো কোড পাওয়া যায়নি।');
    }

    if (creator.role !== UserRole.SUPER_ADMIN && promo.agencyId && promo.agencyId !== creator.agencyId) {
      throw new ForbiddenException('অনুমতি নেই।');
    }

    promo.isActive = isActive;
    return this.promoRepo.save(promo);
  }

  /** Deletes a promo code */
  async deletePromoCode(
    creator: { role: string; agencyId?: string | null },
    codeId: string,
  ): Promise<{ success: boolean }> {
    const promo = await this.promoRepo.findOne({ where: { id: codeId } });
    if (!promo) {
      throw new NotFoundException('প্রোমো কোড পাওয়া যায়নি।');
    }

    if (creator.role !== UserRole.SUPER_ADMIN && promo.agencyId && promo.agencyId !== creator.agencyId) {
      throw new ForbiddenException('অনুমতি নেই।');
    }

    await this.promoRepo.delete(codeId);
    return { success: true };
  }

  /** Player redeems a promo code */
  async redeemPromoCode(userId: string, rawCode: string) {
    const code = rawCode ? rawCode.trim().toUpperCase() : '';
    if (!code) {
      throw new BadRequestException('অনুগ্রহ করে একটি বৈধ প্রোমো কোড দিন।');
    }

    const promo = await this.promoRepo.findOne({ where: { code } });
    if (!promo || !promo.isActive) {
      throw new BadRequestException('প্রোমো কোডটি সঠিক নয় অথবা বর্তমানে নিষ্ক্রিয় রয়েছে।');
    }

    // Expiry check
    if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
      throw new BadRequestException('দুঃখিত, এই প্রোমো কোডটির মেয়াদ শেষ হয়ে গেছে।');
    }

    // Max claims check
    if (promo.maxClaims !== null && promo.totalClaimed >= promo.maxClaims) {
      throw new BadRequestException('দুঃখিত, এই প্রোমো কোডের সর্বোচ্চ ব্যবহারের সীমা শেষ হয়ে গেছে।');
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Agency scope check
    if (promo.agencyId && user.agencyId !== promo.agencyId) {
      throw new ForbiddenException('এই প্রোমো কোডটি আপনার এজেন্সির জন্য প্রযোজ্য নয়।');
    }

    // Check if user already claimed this code
    const existingClaim = await this.redemptionRepo.findOne({
      where: { promoId: promo.id, userId },
    });
    if (existingClaim) {
      throw new BadRequestException('আপনি ইতিমধ্যে এই প্রোমো কোডটি রিডিম করে ফেলেছেন।');
    }

    // Transaction execution
    return this.dataSource.transaction(async (manager) => {
      // Create redemption record
      const redemption = manager.create(UserPromoRedemption, {
        promoId: promo.id,
        userId,
        agencyId: user.agencyId,
        rewardType: promo.rewardType,
        rewardAmount: promo.rewardAmount,
      });
      await manager.save(UserPromoRedemption, redemption);

      // Increment total claims
      promo.totalClaimed += 1;
      await manager.save(PromoCode, promo);

      let newBalance = user.balance;

      if (promo.rewardType === PromoRewardType.CASH) {
        const bonus = new Decimal(promo.rewardAmount);
        const lockedUser = await manager.findOne(User, {
          where: { id: userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (lockedUser) {
          const balanceBefore = new Decimal(lockedUser.balance || 0);
          const balanceAfter = balanceBefore.plus(bonus);
          lockedUser.balance = balanceAfter.toFixed(2);
          await manager.save(User, lockedUser);
          newBalance = lockedUser.balance;

          const txId = `PROMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
          const tx = manager.create(WalletTransaction, {
            userId: lockedUser.id,
            agencyId: lockedUser.agencyId || '',
            type: WalletRequestType.PROMO_BONUS,
            amount: bonus.toFixed(2),
            balanceBefore: balanceBefore.toFixed(2),
            balanceAfter: balanceAfter.toFixed(2),
            provider: null,
            transactionId: txId,
            requestId: null,
          });
          await manager.save(WalletTransaction, tx);

          await this.notificationsService.createNotification(
            userId,
            '🎉 প্রোমো বোনাস রিওয়ার্ড!',
            `অভিনন্দন! "${promo.code}" প্রোমো কোড রিডিম করে আপনি ৳${bonus.toFixed(0)} ক্যাশ বোনাস পেয়েছেন। টাকা ওয়ালেটে যোগ করা হয়েছে।`,
            NotificationType.PROMO_REWARD,
            { code: promo.code, amount: bonus.toNumber() },
            manager,
          );
        }
      } else if (promo.rewardType === PromoRewardType.SPIN) {
        // Reset last spin time by deleting user daily spins
        await manager.delete(DailySpinRecord, { userId });

        await this.notificationsService.createNotification(
          userId,
          '🎡 ফ্রি লাকি স্পিন আনলক!',
          `অভিনন্দন! "${promo.code}" প্রোমো কোড রিডিম সফল হয়েছে। আপনার দৈনিক লাকি হুইল এখনই ফ্রি স্পিন করার জন্য রেডি!`,
          NotificationType.PROMO_REWARD,
          { code: promo.code },
          manager,
        );
      }

      return {
        success: true,
        code: promo.code,
        rewardType: promo.rewardType,
        rewardAmount: promo.rewardAmount,
        newBalance,
        message:
          promo.rewardType === PromoRewardType.CASH
            ? `অভিনন্দন! আপনি ৳${parseFloat(promo.rewardAmount).toLocaleString()} ক্যাশ বোনাস পেয়েছেন!`
            : 'অভিনন্দন! আপনার জন্য একটি ফ্রি লাকি স্পিন আনলক করা হয়েছে!',
      };
    });
  }
}
