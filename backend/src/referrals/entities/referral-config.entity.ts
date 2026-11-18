import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Agency } from '../../agencies/entities/agency.entity';

export enum ReferralQuotaMode {
  LIFETIME = 'lifetime',
  WINDOW = 'window',
}

@Entity('user_referral_configs')
export class ReferralConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @ManyToOne(() => Agency, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Index({ unique: true })
  @Column({ name: 'referral_code', length: 16 })
  referralCode: string;

  @Column({
    type: 'enum',
    enum: ReferralQuotaMode,
    default: ReferralQuotaMode.LIFETIME,
  })
  mode: ReferralQuotaMode;

  @Column({ name: 'max_referrals', type: 'int', default: 5 })
  maxReferrals: number;

  @Column({ name: 'reset_window_hours', type: 'int', default: 0 })
  resetWindowHours: number;

  @Column('decimal', { name: 'bonus_amount', precision: 10, scale: 2, default: 10.0 })
  bonusAmount: string;

  @Column({ name: 'current_window_start', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  currentWindowStart: Date;

  @Column({ name: 'current_window_count', type: 'int', default: 0 })
  currentWindowCount: number;

  @Column({ name: 'total_lifetime_count', type: 'int', default: 0 })
  totalLifetimeCount: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
