import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Agency } from '../../agencies/entities/agency.entity';
import {
  AgencyWalletNumber,
  WalletProvider,
} from '../../agencies/entities/agency-wallet-number.entity';

export enum DepositRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum WalletRequestType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  ADMIN_CREDIT = 'admin_credit',
}

@Entity('deposit_requests')
export class DepositRequest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({
    type: 'enum',
    enum: WalletRequestType,
    enumName: 'wallet_request_type_enum',
    default: WalletRequestType.DEPOSIT,
  })
  type: WalletRequestType;

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

  @Column({ name: 'wallet_number_id', type: 'bigint', nullable: true })
  walletNumberId: string | null;

  @ManyToOne(() => AgencyWalletNumber, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'wallet_number_id' })
  walletNumber: AgencyWalletNumber | null;

  @Column({
    type: 'enum',
    enum: WalletProvider,
    enumName: 'agency_wallet_numbers_provider_enum',
  })
  provider: WalletProvider;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: string;

  @Column({ name: 'transaction_id', length: 64 })
  transactionId: string;

  @Column({
    type: 'enum',
    enum: DepositRequestStatus,
    enumName: 'deposit_requests_status_enum',
    default: DepositRequestStatus.PENDING,
  })
  status: DepositRequestStatus;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User | null;

  @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
