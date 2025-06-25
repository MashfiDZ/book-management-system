import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseConfig } from '../config/database.config';
import { AuthorsService } from '../authors/authors.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { QueryBookDto } from './dto/query-book.dto';
import { Book } from './entities/book.entity';

interface BookRecord {
  id: string;
  title: string;
  isbn: string;
  published_date?: string;
  genre?: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  authors: {
    id: string;
    first_name: string;
    last_name: string;
    bio?: string;
    birth_date?: string;
    created_at: string;
    updated_at: string;
  };
}

@Injectable()
export class BooksService {
  constructor(
    private readonly databaseConfig: DatabaseConfig,
    private readonly authorsService: AuthorsService,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<Book> {
    console.log('Creating book:', createBookDto);
    
    // First, verify that the author exists
    await this.authorsService.findOne(createBookDto.authorId);

    const supabase = this.databaseConfig.getClient();

    // Check if ISBN already exists
    const existingBookResponse = await supabase
      .from('books')
      .select('isbn')
      .eq('isbn', createBookDto.isbn)
      .single();

    if (existingBookResponse.data) {
      console.log('Duplicate ISBN found:', existingBookResponse.data);
      throw new BadRequestException(
        `Book with ISBN ${createBookDto.isbn} already exists`,
      );
    }

    const response = await supabase
      .from('books')
      .insert([
        {
          title: createBookDto.title,
          isbn: createBookDto.isbn,
          published_date: createBookDto.publishedDate,
          genre: createBookDto.genre,
          author_id: createBookDto.authorId,
        },
      ])
      .select(
        `
        *,
        authors (
          id,
          first_name,
          last_name,
          bio,
          birth_date,
          created_at,
          updated_at
        )
      `,
      )
      .single();

    if (response.error) {
      console.error('Error creating book:', response.error);
      throw new BadRequestException(
        `Failed to create book: ${response.error.message}`,
      );
    }

    console.log('Book created successfully:', response.data);
    return this.mapToEntity(response.data as BookRecord);
  }

  async findAll(query: QueryBookDto): Promise<{ data: Book[]; total: number }> {
    console.log('Query params:', query);
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    const offset = (page - 1) * limit;
    console.log('Pagination:', { page, limit, offset });

    const supabase = this.databaseConfig.getClient();

    // First get total count
    const countQuery = supabase
      .from('books')
      .select('*', { count: 'exact', head: true });

    // Add filters to count query
    if (query.title) {
      console.log('Applying title filter:', query.title);
      countQuery.ilike('title', `%${query.title}%`);
    }
    if (query.isbn) {
      console.log('Applying ISBN filter:', query.isbn);
      countQuery.ilike('isbn', `%${query.isbn}%`);
    }
    if (query.genre) {
      console.log('Applying genre filter:', query.genre);
      countQuery.ilike('genre', `%${query.genre}%`);
    }
    if (query.authorId) {
      console.log('Applying author filter:', query.authorId);
      this.validateUUID(query.authorId);
      countQuery.eq('author_id', query.authorId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error getting count:', countError);
      throw new BadRequestException(
        `Failed to fetch books count: ${countError.message}`,
      );
    }

    console.log('Total count:', count);

    // Now get paginated data
    const dataQuery = supabase
      .from('books')
      .select(
        `
        *,
        authors (
          id,
          first_name,
          last_name,
          bio,
          birth_date,
          created_at,
          updated_at
        )
      `,
      );

    // Add filters to data query
    if (query.title) {
      dataQuery.ilike('title', `%${query.title}%`);
    }
    if (query.isbn) {
      dataQuery.ilike('isbn', `%${query.isbn}%`);
    }
    if (query.genre) {
      dataQuery.ilike('genre', `%${query.genre}%`);
    }
    if (query.authorId) {
      dataQuery.eq('author_id', query.authorId);
    }

    // Add pagination
    const { data, error } = await dataQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching books:', error);
      throw new BadRequestException(`Failed to fetch books: ${error.message}`);
    }

    const result = {
      data: (data || []).map((item) => this.mapToEntity(item as BookRecord)),
      total: count || 0,
    };

    console.log('Query results:', {
      total: result.total,
      resultCount: result.data.length,
      page,
      limit,
    });

    return result;
  }

  async findOne(id: string): Promise<Book> {
    console.log('Finding book by ID:', id);
    this.validateUUID(id);
    const supabase = this.databaseConfig.getClient();

    const response = await supabase
      .from('books')
      .select(
        `
        *,
        authors (
          id,
          first_name,
          last_name,
          bio,
          birth_date,
          created_at,
          updated_at
        )
      `,
      )
      .eq('id', id)
      .single();

    if (response.error || !response.data) {
      console.log('Book not found:', { id, error: response.error });
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    console.log('Book found:', response.data);
    return this.mapToEntity(response.data as BookRecord);
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
    console.log('Updating book:', { id, updateBookDto });
    this.validateUUID(id);

    // Check if book exists
    await this.findOne(id);

    // If authorId is being updated, verify the new author exists
    if (updateBookDto.authorId) {
      await this.authorsService.findOne(updateBookDto.authorId);
    }

    // If ISBN is being updated, check for duplicates
    if (updateBookDto.isbn) {
      const supabase = this.databaseConfig.getClient();
      const existingBookResponse = await supabase
        .from('books')
        .select('id, isbn')
        .eq('isbn', updateBookDto.isbn)
        .neq('id', id)
        .single();

      if (existingBookResponse.data) {
        console.log(
          'Duplicate ISBN found during update:',
          existingBookResponse.data,
        );
        throw new BadRequestException(
          `Book with ISBN ${updateBookDto.isbn} already exists`,
        );
      }
    }

    const supabase = this.databaseConfig.getClient();

    const updateData: Partial<BookRecord> = {};
    if (updateBookDto.title !== undefined)
      updateData.title = updateBookDto.title;
    if (updateBookDto.isbn !== undefined)
      updateData.isbn = updateBookDto.isbn;
    if (updateBookDto.publishedDate !== undefined)
      updateData.published_date = updateBookDto.publishedDate;
    if (updateBookDto.genre !== undefined)
      updateData.genre = updateBookDto.genre;
    if (updateBookDto.authorId !== undefined)
      updateData.author_id = updateBookDto.authorId;

    console.log('Update data:', updateData);

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    const response = await supabase
      .from('books')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        authors (
          id,
          first_name,
          last_name,
          bio,
          birth_date,
          created_at,
          updated_at
        )
      `,
      )
      .single();

    if (response.error) {
      console.error('Error updating book:', response.error);
      throw new BadRequestException(
        `Failed to update book: ${response.error.message}`,
      );
    }

    console.log('Book updated successfully:', response.data);
    return this.mapToEntity(response.data as BookRecord);
  }

  async remove(id: string): Promise<void> {
    console.log('Removing book:', id);
    this.validateUUID(id);
    const supabase = this.databaseConfig.getClient();

    // First check if book exists
    const existingBookResponse = await supabase
      .from('books')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingBookResponse.data) {
      console.log('Book not found for deletion:', id);
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    const response = await supabase.from('books').delete().eq('id', id);

    if (response.error) {
      console.error('Error deleting book:', response.error);
      throw new BadRequestException(
        `Failed to delete book: ${response.error.message}`,
      );
    }

    console.log('Book deleted successfully:', id);
  }

  private validateUUID(id: string): void {
    console.log('Validating UUID:', id);
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log('Invalid UUID format:', id);
      throw new BadRequestException('Invalid UUID format');
    }
  }

  private mapToEntity(data: BookRecord): Book {
    return new Book({
      id: data.id,
      title: data.title,
      isbn: data.isbn,
      publishedDate: data.published_date
        ? new Date(data.published_date)
        : undefined,
      genre: data.genre,
      author: {
        id: data.authors.id,
        firstName: data.authors.first_name,
        lastName: data.authors.last_name,
        bio: data.authors.bio,
        birthDate: data.authors.birth_date
          ? new Date(data.authors.birth_date)
          : undefined,
        createdAt: new Date(data.authors.created_at),
        updatedAt: new Date(data.authors.updated_at),
      },
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });
  }
}
