import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReferralQuotaMode } from '../entities/referral-config.entity';

export class UpdateAgencyDefaultReferralDto {
  @IsOptional()
  @IsEnum(ReferralQuotaMode)
  defaultReferralMode?: ReferralQuotaMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  defaultMaxReferrals?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(720)
  defaultResetWindowHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10000)
  defaultReferralBonus?: number;

  @IsOptional()
  @IsBoolean()
  isReferralEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  syncToExistingUsers?: boolean;
}
