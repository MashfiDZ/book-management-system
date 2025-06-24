import { AuthorDto } from '../../authors/dto/author.dto';

export class BookDto {
  id: string;
  title: string;
  isbn: string;
  publishedDate?: string;
  genre?: string;
  author: AuthorDto; // Remove authorId, keep only author object
  createdAt: string;
  updatedAt: string;
}
