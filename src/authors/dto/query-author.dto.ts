import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class QueryAuthorDto {
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '10';

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
