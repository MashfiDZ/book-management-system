import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { DatabaseConfig } from '../config/database.config';
import { AuthorsModule } from '../authors/authors.module';

@Module({
  imports: [AuthorsModule], // Import AuthorsModule to use AuthorsService
  controllers: [BooksController],
  providers: [BooksService, DatabaseConfig],
  exports: [BooksService],
})
export class BooksModule {}
