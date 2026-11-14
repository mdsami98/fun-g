import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Agency } from '../../agencies/entities/agency.entity';
import { WalletRequestType } from './deposit-request.entity';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

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

  @Column({
    type: 'enum',
    enum: WalletRequestType,
    enumName: 'wallet_request_type_enum',
  })
  type: WalletRequestType;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: string;

  @Column('decimal', { name: 'balance_before', precision: 12, scale: 2 })
  balanceBefore: string;

  @Column('decimal', { name: 'balance_after', precision: 12, scale: 2 })
  balanceAfter: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  provider: string | null;

  @Column({ name: 'transaction_id', type: 'varchar', length: 64, nullable: true })
  transactionId: string | null;

  @Column({ name: 'request_id', type: 'bigint', nullable: true })
  requestId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
