import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReferralQuotaMode } from '../entities/referral-config.entity';

export class UpdateReferralConfigDto {
  @IsOptional()
  @IsEnum(ReferralQuotaMode)
  mode?: ReferralQuotaMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxReferrals?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  resetWindowHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  bonusAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
