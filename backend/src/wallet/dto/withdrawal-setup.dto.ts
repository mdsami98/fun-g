import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { WalletProvider } from '../../agencies/entities/agency-wallet-number.entity';

export class SetupWithdrawalAccountDto {
  @IsEnum(WalletProvider)
  provider: WalletProvider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  accountNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  accountGroup?: string;

  @IsString()
  @MinLength(4)
  withdrawalPassword: string;

  @IsString()
  @MinLength(4)
  confirmPassword: string;
}

export class SubmitWithdrawalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  accountNumber: string;

  @IsEnum(WalletProvider)
  provider: WalletProvider;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @MinLength(4)
  withdrawalPassword: string;
}
