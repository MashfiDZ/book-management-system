import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class CreateAuthorDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;
}
