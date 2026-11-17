import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_vip_claims')
@Unique(['userId', 'tierLevel'])
export class VipClaimRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'tier_level', type: 'int' })
  tierLevel: number;

  @Column({ name: 'tier_name' })
  tierName: string;

  @Column('decimal', { name: 'reward_amount', precision: 10, scale: 2 })
  rewardAmount: string;

  @CreateDateColumn({ name: 'claimed_at' })
  claimedAt: Date;
}
