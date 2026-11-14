import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Pool of crash scores the Aviator engine draws from, one row per round.
 * At most one row can have nextPick = true: it is the crash score for the
 * next round.
 */
@Entity('aviator_crash_point')
@Check('CHK_aviator_crash_point_score_min', '"crashScore" >= 1')
@Index('IDX_aviator_crash_point_single_next_pick', ['nextPick'], {
  unique: true,
  where: '"nextPick" = true',
})
export class CrashSeed {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  crashScore: string;

  @Column({ default: false })
  nextPick: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
