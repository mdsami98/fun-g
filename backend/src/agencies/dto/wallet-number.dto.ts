import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  WalletAccountType,
  WalletProvider,
} from '../entities/agency-wallet-number.entity';

export class CreateWalletNumberDto {
  @IsEnum(WalletProvider, {
    message: 'provider must be bkash, nagad, or rocket',
  })
  provider: WalletProvider;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  @IsOptional()
  @IsEnum(WalletAccountType, {
    message: 'accountType must be personal, agent, or merchant',
  })
  @Transform(({ value, obj }) => value ?? obj.account_type ?? WalletAccountType.PERSONAL)
  accountType?: WalletAccountType = WalletAccountType.PERSONAL;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj }) => {
    if (value !== undefined) return Boolean(value);
    if (obj.is_active !== undefined) return Boolean(obj.is_active);
    return true;
  })
  isActive?: boolean = true;
}

export class UpdateWalletNumberDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== null ? String(value) : undefined))
  id?: string;

  @IsOptional()
  @IsEnum(WalletProvider, {
    message: 'provider must be bkash, nagad, or rocket',
  })
  provider?: WalletProvider;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number?: string;

  @IsOptional()
  @IsEnum(WalletAccountType, {
    message: 'accountType must be personal, agent, or merchant',
  })
  @Transform(({ value, obj }) => value ?? obj?.account_type)
  accountType?: WalletAccountType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value, obj }) => {
    if (value !== undefined) return Boolean(value);
    if (obj?.is_active !== undefined) return Boolean(obj.is_active);
    return undefined;
  })
  isActive?: boolean;
}

export class SyncWalletNumbersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateWalletNumberDto)
  walletNumbers: UpdateWalletNumberDto[];
}
