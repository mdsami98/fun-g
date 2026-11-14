import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRestrictionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;
}
