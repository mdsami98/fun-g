import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateAgencyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^[A-Z0-9]{4,20}$/, {
    message:
      'agencyCode must be 4-20 uppercase letters/numbers',
  })
  agencyCode: string;

  @IsOptional()
  @IsString()
  bkashNumber?: string;

  @IsString()
  @IsNotEmpty()
  adminName: string;

  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'adminPhone must be a valid phone number' })
  adminPhone: string;

  @IsString()
  @MinLength(6)
  adminPassword: string;
}
