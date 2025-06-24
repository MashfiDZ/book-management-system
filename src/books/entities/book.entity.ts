import { Author } from '../../authors/entities/author.entity';

export class Book {
  id: string;
  title: string;
  isbn: string;
  publishedDate?: Date;
  genre?: string;
  author: Author; // Make this required since we always include it
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Book>) {
    Object.assign(this, partial);
  }
}
