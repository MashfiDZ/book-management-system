import { Module } from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { AuthorsController } from './authors.controller';
import { DatabaseConfig } from '../config/database.config';

@Module({
  controllers: [AuthorsController],
  providers: [AuthorsService, DatabaseConfig],
  exports: [AuthorsService], // Export for use in other modules (like Books)
})
export class AuthorsModule {}
