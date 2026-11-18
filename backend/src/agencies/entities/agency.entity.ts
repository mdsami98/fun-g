import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AgencyWalletNumber } from './agency-wallet-number.entity';

@Entity('agencies')
export class Agency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  agencyCode: string;

  @Column({ nullable: true })
  bkashNumber: string;

  @Column('decimal', { precision: 10, scale: 2, default: 40 })
  withdrawalChargeRate: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'default_referral_mode', default: 'lifetime' })
  defaultReferralMode: string;

  @Column({ name: 'default_max_referrals', type: 'int', default: 5 })
  defaultMaxReferrals: number;

  @Column({ name: 'default_reset_window_hours', type: 'int', default: 24 })
  defaultResetWindowHours: number;

  @Column('decimal', { name: 'default_referral_bonus', precision: 10, scale: 2, default: 10.0 })
  defaultReferralBonus: string;

  @Column({ name: 'is_referral_enabled', default: true })
  isReferralEnabled: boolean;

  @OneToMany(() => User, (user) => user.agency)
  users: User[];

  @OneToMany(() => AgencyWalletNumber, (walletNumber) => walletNumber.agency)
  walletNumbers: AgencyWalletNumber[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
