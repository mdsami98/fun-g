import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WalletProvider } from '../../agencies/entities/agency-wallet-number.entity';

@Entity('user_withdrawal_accounts')
@Unique(['userId', 'provider'])
export class UserWithdrawalAccount {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: WalletProvider,
    enumName: 'agency_wallet_numbers_provider_enum',
  })
  provider: WalletProvider;

  @Column({ name: 'account_number', type: 'varchar', length: 20 })
  accountNumber: string;

  @Column({ name: 'account_group', type: 'varchar', length: 64, default: 'E-Wallet' })
  accountGroup: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
