import { IsOptional, IsString, IsNumberString, IsUUID } from 'class-validator';

export class QueryBookDto {
  @IsOptional()
  @IsNumberString()
  page?: string = '1';

  @IsOptional()
  @IsNumberString()
  limit?: string = '10';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;

  @IsOptional()
  @IsString()
  genre?: string;
}
