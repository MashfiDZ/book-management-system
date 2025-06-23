import { AuthorDto } from '../../authors/dto/author.dto';

export class BookDto {
  id: string;
  title: string;
  isbn: string;
  publishedDate?: string;
  genre?: string;
  authorId: string;
  author?: AuthorDto; // Include author information in responses
  createdAt: string;
  updatedAt: string;
}
