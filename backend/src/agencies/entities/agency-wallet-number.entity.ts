import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Agency } from './agency.entity';

export enum WalletProvider {
  BKASH = 'bkash',
  NAGAD = 'nagad',
  ROCKET = 'rocket',
}

export enum WalletAccountType {
  PERSONAL = 'personal',
  AGENT = 'agent',
  MERCHANT = 'merchant',
}

@Entity('agency_wallet_numbers')
export class AgencyWalletNumber {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'agency_id', type: 'uuid' })
  agencyId: string;

  @ManyToOne(() => Agency, (agency) => agency.walletNumbers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agency_id' })
  agency: Agency;

  @Column({
    type: 'enum',
    enum: WalletProvider,
    enumName: 'agency_wallet_numbers_provider_enum',
  })
  provider: WalletProvider;

  @Column({ type: 'varchar', length: 20 })
  number: string;

  @Column({
    name: 'account_type',
    type: 'enum',
    enum: WalletAccountType,
    enumName: 'agency_wallet_numbers_account_type_enum',
    default: WalletAccountType.PERSONAL,
  })
  accountType: WalletAccountType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
