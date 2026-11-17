import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { VipClaimRecord } from './entities/vip-claim.entity';
import { User } from '../users/entities/user.entity';
import { DepositRequest, DepositRequestStatus, WalletRequestType } from '../wallet/entities/deposit-request.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

export interface VipTierConfig {
  level: number;
  name: string;
  bengaliName: string;
  badge: string;
  minDeposit: number;
  levelUpReward: number;
  perks: string[];
}

export const VIP_TIERS: VipTierConfig[] = [
  {
    level: 1,
    name: 'Bronze',
    bengaliName: 'ব্রোঞ্জ',
    badge: '🥉',
    minDeposit: 0,
    levelUpReward: 0,
    perks: ['স্ট্যান্ডার্ড ডিপোজিট ও উইথড্রয়াল', 'রেফারেল প্রোগ্রাম সুবিধা', '২৪/৭ কাস্টমার সাপোর্ট'],
  },
  {
    level: 2,
    name: 'Silver',
    bengaliName: 'সিলভার',
    badge: '🥈',
    minDeposit: 2000,
    levelUpReward: 50,
    perks: ['৳৫০ এককালীন লেভেল-আপ ক্যাশ বোনাস', 'উইথড্রয়াল প্রসেসিংয়ে অগ্রাধিকার', 'দৈনিক লাকি স্পিনে বিশেষ চান্স'],
  },
  {
    level: 3,
    name: 'Gold',
    bengaliName: 'গোল্ড',
    badge: '🥇',
    minDeposit: 10000,
    levelUpReward: 250,
    perks: ['৳২৫০ লেভেল-আপ ক্যাশ বোনাস', '১% অতিরিক্ত ডিপোজিট বোনাস', 'উচ্চ উইথড্রয়াল লিমিট', 'ডেডিকেটেড ভিআইপি সাপোর্ট'],
  },
  {
    level: 4,
    name: 'Diamond',
    bengaliName: 'ডায়মন্ড',
    badge: '💎',
    minDeposit: 50000,
    levelUpReward: 1000,
    perks: ['৳১,০০০ মেগা লেভেল-আপ ক্যাশ বোনাস', 'তাত্ক্ষণিক এক্সপ্রেস উইথড্রয়াল', 'ব্যক্তিগত ভিআইপি একাউন্ট ম্যানেজার', 'এক্সক্লুসিভ টুর্নামেন্ট এন্ট্রি'],
  },
];

@Injectable()
export class VipService {
  constructor(
    @InjectRepository(VipClaimRecord)
    private readonly claimRepo: Repository<VipClaimRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(DepositRequest)
    private readonly depositRepo: Repository<DepositRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /** Calculates player's cumulative approved deposits */
  async getTotalApprovedDeposits(userId: string): Promise<Decimal> {
    const approvedDeposits = await this.depositRepo.find({
      where: {
        userId,
        status: DepositRequestStatus.APPROVED,
        type: WalletRequestType.DEPOSIT,
      },
      select: { amount: true },
    });

    let total = new Decimal(0);
    for (const d of approvedDeposits) {
      total = total.plus(new Decimal(d.amount || 0));
    }
    return total;
  }

  /** Gets player's VIP status, current tier, progress to next tier, and claimable rewards */
  async getVipStatus(userId: string) {
    const totalDepositsDecimal = await this.getTotalApprovedDeposits(userId);
    const totalDeposited = totalDepositsDecimal.toNumber();

    // Determine current tier
    let currentTier = VIP_TIERS[0];
    for (const tier of VIP_TIERS) {
      if (totalDeposited >= tier.minDeposit) {
        currentTier = tier;
      }
    }

    const nextTier = VIP_TIERS.find((t) => t.level === currentTier.level + 1) || null;

    let progressPercentage = 100;
    let requiredForNext = 0;

    if (nextTier) {
      const currentTierMin = currentTier.minDeposit;
      const targetMin = nextTier.minDeposit;
      const progressAmount = Math.max(0, totalDeposited - currentTierMin);
      const span = targetMin - currentTierMin;
      progressPercentage = Math.min(100, Math.floor((progressAmount / span) * 100));
      requiredForNext = Math.max(0, targetMin - totalDeposited);
    }

    // Check claimed rewards
    const claims = await this.claimRepo.find({ where: { userId } });
    const claimedLevels = new Set(claims.map((c) => c.tierLevel));

    const tiers = VIP_TIERS.map((tier) => {
      const isReached = currentTier.level >= tier.level;
      const isClaimed = claimedLevels.has(tier.level);
      const canClaim = isReached && tier.levelUpReward > 0 && !isClaimed;

      return {
        ...tier,
        isReached,
        isClaimed,
        canClaim,
      };
    });

    return {
      currentTier,
      nextTier,
      totalDeposited,
      progressPercentage,
      requiredForNext,
      tiers,
    };
  }

  /** Claim level-up reward */
  async claimReward(userId: string, tierLevel: number) {
    const targetTier = VIP_TIERS.find((t) => t.level === tierLevel);
    if (!targetTier || targetTier.levelUpReward <= 0) {
      throw new BadRequestException('No reward available for this VIP tier');
    }

    const totalDeposited = (await this.getTotalApprovedDeposits(userId)).toNumber();
    if (totalDeposited < targetTier.minDeposit) {
      throw new BadRequestException('You have not unlocked this VIP tier yet');
    }

    const existingClaim = await this.claimRepo.findOne({
      where: { userId, tierLevel },
    });
    if (existingClaim) {
      throw new BadRequestException('This VIP level-up reward has already been claimed');
    }

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Save claim record
      const claim = manager.create(VipClaimRecord, {
        userId,
        tierLevel,
        tierName: targetTier.name,
        rewardAmount: targetTier.levelUpReward.toFixed(2),
      });
      await manager.save(VipClaimRecord, claim);

      // Credit balance
      const reward = new Decimal(targetTier.levelUpReward);
      const balanceBefore = new Decimal(user.balance || 0);
      const balanceAfter = balanceBefore.plus(reward);

      user.balance = balanceAfter.toFixed(2);
      await manager.save(User, user);

      // Record transaction
      const txId = `VIP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const tx = manager.create(WalletTransaction, {
        userId: user.id,
        agencyId: user.agencyId || '',
        type: WalletRequestType.VIP_REWARD,
        amount: reward.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        provider: null,
        transactionId: txId,
        requestId: null,
      });
      await manager.save(WalletTransaction, tx);

      // Notification
      await this.notificationsService.createNotification(
        userId,
        `💎 ${targetTier.name} VIP বোনাস!`,
        `অভিনন্দন! আপনি ${targetTier.bengaliName} (${targetTier.name}) লেভেল-আপ রিওয়ার্ড বাবদ ৳${targetTier.levelUpReward} ক্যাশ বোনাস পেয়েছেন!`,
        NotificationType.VIP_REWARD,
        { tier: targetTier.name, amount: targetTier.levelUpReward },
        manager,
      );

      return {
        success: true,
        tierName: targetTier.name,
        rewardAmount: targetTier.levelUpReward,
        newBalance: user.balance,
      };
    });
  }
}
