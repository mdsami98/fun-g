import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { WalletProvider } from '../../agencies/entities/agency-wallet-number.entity';

export class CreateDepositDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null ? String(value) : undefined))
  walletNumberId?: string;

  @IsEnum(WalletProvider, {
    message: 'provider must be bkash, nagad, or rocket',
  })
  provider: WalletProvider;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(100, { message: 'Minimum deposit amount is ৳100' })
  @Max(100000, { message: 'Maximum deposit amount is ৳100,000' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'Transaction ID (TrxID) is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  transactionId: string;
}
