import { IsNumber, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddBalanceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1, { message: 'Amount must be greater than 0' })
  @Max(1000000, { message: 'Maximum amount is ৳1,000,000' })
  amount: number;
}
