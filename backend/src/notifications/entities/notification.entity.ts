import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  DEPOSIT_APPROVED = 'deposit_approved',
  DEPOSIT_REJECTED = 'deposit_rejected',
  WITHDRAW_APPROVED = 'withdraw_approved',
  WITHDRAW_REJECTED = 'withdraw_rejected',
  REFERRAL_BONUS = 'referral_bonus',
  SPIN_REWARD = 'spin_reward',
  VIP_REWARD = 'vip_reward',
  PROMO_REWARD = 'promo_reward',
  SYSTEM = 'system',
}


@Entity('user_notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', default: NotificationType.SYSTEM })
  type: NotificationType;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @Index()
  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
