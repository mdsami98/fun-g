import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GameRoundStatus } from '../enums/game-round-status.enum';

@Entity('game_rounds')
export class GameRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: GameRoundStatus, default: GameRoundStatus.BETTING })
  status: GameRoundStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  crashPoint: string;

  @Column({ nullable: true })
  randomSeed: string;

  @Column({ type: 'timestamptz' })
  bettingStartedAt: Date;

  @Column('int')
  bettingDurationMs: number;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  crashedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
