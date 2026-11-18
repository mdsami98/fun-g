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

@Entity('user_daily_spins')
export class DailySpinRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'agency_id', type: 'uuid', nullable: true })
  agencyId: string | null;

  @Column({ name: 'reward_type', default: 'nothing' })
  rewardType: 'cash' | 'nothing';

  @Column('decimal', { name: 'reward_amount', precision: 10, scale: 2, default: 0 })
  rewardAmount: string;

  @Column({ name: 'reward_label' })
  rewardLabel: string;

  @Index()
  @CreateDateColumn({ name: 'spun_at' })
  spunAt: Date;
}
