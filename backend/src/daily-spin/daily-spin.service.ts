import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { DailySpinRecord } from './entities/daily-spin.entity';
import { User } from '../users/entities/user.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { WalletRequestType } from '../wallet/entities/deposit-request.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

export interface SpinSlice {
  index: number;
  label: string;
  amount: number;
  type: 'cash' | 'nothing';
  weight: number;
  color: string;
  textColor: string;
}

export const SPIN_SLICES: SpinSlice[] = [
  { index: 0, label: '৳৫', amount: 5, type: 'cash', weight: 35, color: '#f59e0b', textColor: '#090d16' },
  { index: 1, label: 'Try Again', amount: 0, type: 'nothing', weight: 20, color: '#334155', textColor: '#cbd5e1' },
  { index: 2, label: '৳১০', amount: 10, type: 'cash', weight: 25, color: '#10b981', textColor: '#090d16' },
  { index: 3, label: 'Better Luck', amount: 0, type: 'nothing', weight: 10, color: '#1e293b', textColor: '#94a3b8' },
  { index: 4, label: '৳২০', amount: 20, type: 'cash', weight: 15, color: '#8b5cf6', textColor: '#ffffff' },
  { index: 5, label: 'Try Again', amount: 0, type: 'nothing', weight: 10, color: '#334155', textColor: '#cbd5e1' },
  { index: 6, label: '৳৫০', amount: 50, type: 'cash', weight: 5, color: '#ec4899', textColor: '#ffffff' },
  { index: 7, label: '৳৫', amount: 5, type: 'cash', weight: 25, color: '#eab308', textColor: '#090d16' },
];

const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class DailySpinService {
  constructor(
    @InjectRepository(DailySpinRecord)
    private readonly spinRepo: Repository<DailySpinRecord>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  /** Checks if player is eligible to spin today */
  async getSpinStatus(userId: string) {
    const lastSpin = await this.spinRepo.findOne({
      where: { userId },
      order: { spunAt: 'DESC' },
    });

    const now = Date.now();
    let canSpin = true;
    let nextSpinAt: Date | null = null;
    let cooldownRemainingMs = 0;

    if (lastSpin) {
      const elapsed = now - new Date(lastSpin.spunAt).getTime();
      if (elapsed < SPIN_COOLDOWN_MS) {
        canSpin = false;
        cooldownRemainingMs = SPIN_COOLDOWN_MS - elapsed;
        nextSpinAt = new Date(new Date(lastSpin.spunAt).getTime() + SPIN_COOLDOWN_MS);
      }
    }

    return {
      canSpin,
      nextSpinAt,
      cooldownRemainingMs,
      slices: SPIN_SLICES.map(({ weight, ...rest }) => rest),
      lastSpin: lastSpin
        ? {
            spunAt: lastSpin.spunAt,
            rewardLabel: lastSpin.rewardLabel,
            rewardAmount: lastSpin.rewardAmount,
          }
        : null,
    };
  }

  /** Picks a random slice based on cumulative weights */
  private pickWinningSlice(): SpinSlice {
    const totalWeight = SPIN_SLICES.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const slice of SPIN_SLICES) {
      if (rand < slice.weight) {
        return slice;
      }
      rand -= slice.weight;
    }

    return SPIN_SLICES[0];
  }

  /** Executes daily spin */
  async executeSpin(userId: string) {
    const status = await this.getSpinStatus(userId);
    if (!status.canSpin) {
      const hours = Math.ceil(status.cooldownRemainingMs / (3600 * 1000));
      throw new BadRequestException(
        `Daily spin is currently on cooldown. Please try again in ~${hours} hours.`,
      );
    }

    const winningSlice = this.pickWinningSlice();

    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Record the spin
      const spinRecord = manager.create(DailySpinRecord, {
        userId,
        agencyId: user.agencyId,
        rewardType: winningSlice.type,
        rewardAmount: winningSlice.amount.toFixed(2),
        rewardLabel: winningSlice.label,
      });
      await manager.save(DailySpinRecord, spinRecord);

      let newBalance = user.balance;

      if (winningSlice.type === 'cash' && winningSlice.amount > 0) {
        const bonus = new Decimal(winningSlice.amount);
        const balanceBefore = new Decimal(user.balance || 0);
        const balanceAfter = balanceBefore.plus(bonus);

        user.balance = balanceAfter.toFixed(2);
        newBalance = user.balance;
        await manager.save(User, user);

        const txId = `SPIN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const tx = manager.create(WalletTransaction, {
          userId: user.id,
          agencyId: user.agencyId || '',
          type: WalletRequestType.SPIN_BONUS,
          amount: bonus.toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          provider: null,
          transactionId: txId,
          requestId: null,
        });
        await manager.save(WalletTransaction, tx);

        // Notify user of cash prize
        await this.notificationsService.createNotification(
          userId,
          '🎉 লাকি স্পিন রিওয়ার্ড!',
          `অভিনন্দন! দৈনিক লাকি হুইল ঘুরিয়ে আপনি ৳${winningSlice.amount} ক্যাশ বোনাস জিতেছেন। আপনার ওয়ালেটে টাকা যোগ করা হয়েছে।`,
          NotificationType.SPIN_REWARD,
          { prize: winningSlice.label, amount: winningSlice.amount },
          manager,
        );
      }

      return {
        selectedSliceIndex: winningSlice.index,
        prize: {
          label: winningSlice.label,
          amount: winningSlice.amount,
          type: winningSlice.type,
        },
        newBalance,
        nextSpinAt: new Date(Date.now() + SPIN_COOLDOWN_MS),
      };
    });
  }
}
