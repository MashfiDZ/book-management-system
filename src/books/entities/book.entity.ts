import { Author } from '../../authors/entities/author.entity';

export class Book {
  id: string;
  title: string;
  isbn: string;
  publishedDate?: Date;
  genre?: string;
  authorId: string;
  author?: Author; // For populated responses
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Book>) {
    Object.assign(this, partial);
  }
}
