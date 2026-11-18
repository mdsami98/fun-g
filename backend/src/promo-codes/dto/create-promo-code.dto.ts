export class CreatePromoCodeDto {
  code: string;
  rewardType: 'cash' | 'spin';
  rewardAmount?: number;
  maxClaims?: number | null;
  expiresAt?: string | null;
}
