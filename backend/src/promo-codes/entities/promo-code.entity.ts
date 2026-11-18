import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Agency } from '../../agencies/entities/agency.entity';
import { UserPromoRedemption } from './promo-redemption.entity';

export enum PromoRewardType {
  CASH = 'cash',
  SPIN = 'spin',
}

@Entity('promo_codes')
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'uuid', nullable: true })
  agencyId: string | null;

  @ManyToOne(() => Agency, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agencyId' })
  agency: Agency | null;

  @Column({ type: 'varchar', length: 32, default: PromoRewardType.CASH })
  rewardType: PromoRewardType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  rewardAmount: string;

  @Column({ type: 'int', nullable: true })
  maxClaims: number | null;

  @Column({ type: 'int', default: 0 })
  totalClaimed: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => UserPromoRedemption, (redemption) => redemption.promo)
  redemptions: UserPromoRedemption[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
