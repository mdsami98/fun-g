import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PromoCode } from './promo-code.entity';
import { User } from '../../users/entities/user.entity';

@Entity('user_promo_redemptions')
@Index(['promoId', 'userId'], { unique: true })
export class UserPromoRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  promoId: string;

  @ManyToOne(() => PromoCode, (promo) => promo.redemptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promoId' })
  promo: PromoCode;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  agencyId: string | null;

  @Column({ type: 'varchar', length: 32 })
  rewardType: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  rewardAmount: string;

  @CreateDateColumn({ type: 'timestamptz' })
  redeemedAt: Date;
}
