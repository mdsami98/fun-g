import { IsNumber, Min } from 'class-validator';

export class PlaceBetDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}
