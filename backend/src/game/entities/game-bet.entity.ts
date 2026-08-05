import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GameBetStatus } from '../enums/game-bet-status.enum';
import { GameRound } from './game-round.entity';
import { User } from '../../users/entities/user.entity';

@Entity('game_bets')
@Index(['roundId', 'userId'], { unique: true })
export class GameBet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => GameRound)
  @JoinColumn({ name: 'roundId' })
  round: GameRound;

  @Column()
  roundId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: string;

  @Column({ type: 'enum', enum: GameBetStatus, default: GameBetStatus.PENDING })
  status: GameBetStatus;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cashOutMultiplier: string | null;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  payout: string | null;

  @CreateDateColumn()
  placedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
