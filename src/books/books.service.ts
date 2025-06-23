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

@Injectable()
export class BooksService {
  constructor(
    private readonly databaseConfig: DatabaseConfig,
    private readonly authorsService: AuthorsService,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<Book> {
    // First, verify that the author exists
    await this.authorsService.findOne(createBookDto.authorId);

    const supabase = this.databaseConfig.getClient();

    // Check if ISBN already exists
    const { data: existingBook } = await supabase
      .from('books')
      .select('isbn')
      .eq('isbn', createBookDto.isbn)
      .single();

    if (existingBook) {
      throw new BadRequestException(
        `Book with ISBN ${createBookDto.isbn} already exists`,
      );
    }

    const { data, error } = await supabase
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

    if (error) {
      throw new BadRequestException(`Failed to create book: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async findAll(query: QueryBookDto): Promise<{ data: Book[]; total: number }> {
    const supabase = this.databaseConfig.getClient();
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase.from('books').select(
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
      { count: 'exact' },
    );

    // Add search filters
    if (query.title) {
      queryBuilder = queryBuilder.ilike('title', `%${query.title}%`);
    }
    if (query.isbn) {
      queryBuilder = queryBuilder.ilike('isbn', `%${query.isbn}%`);
    }
    if (query.genre) {
      queryBuilder = queryBuilder.ilike('genre', `%${query.genre}%`);
    }
    if (query.authorId) {
      this.validateUUID(query.authorId);
      queryBuilder = queryBuilder.eq('author_id', query.authorId);
    }

    // Add pagination
    queryBuilder = queryBuilder
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new BadRequestException(`Failed to fetch books: ${error.message}`);
    }

    return {
      data: data.map((item) => this.mapToEntity(item)),
      total: count || 0,
    };
  }

  async findOne(id: string): Promise<Book> {
    this.validateUUID(id);
    const supabase = this.databaseConfig.getClient();

    const { data, error } = await supabase
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

    if (error || !data) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    return this.mapToEntity(data);
  }

  async update(id: string, updateBookDto: UpdateBookDto): Promise<Book> {
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
      const { data: existingBook } = await supabase
        .from('books')
        .select('id, isbn')
        .eq('isbn', updateBookDto.isbn)
        .neq('id', id)
        .single();

      if (existingBook) {
        throw new BadRequestException(
          `Book with ISBN ${updateBookDto.isbn} already exists`,
        );
      }
    }

    const supabase = this.databaseConfig.getClient();

    const updateData: any = {};
    if (updateBookDto.title !== undefined)
      updateData.title = updateBookDto.title;
    if (updateBookDto.isbn !== undefined) updateData.isbn = updateBookDto.isbn;
    if (updateBookDto.publishedDate !== undefined)
      updateData.published_date = updateBookDto.publishedDate;
    if (updateBookDto.genre !== undefined)
      updateData.genre = updateBookDto.genre;
    if (updateBookDto.authorId !== undefined)
      updateData.author_id = updateBookDto.authorId;

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    const { data, error } = await supabase
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

    if (error) {
      throw new BadRequestException(`Failed to update book: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async remove(id: string): Promise<void> {
    this.validateUUID(id);
    const supabase = this.databaseConfig.getClient();

    // First check if book exists
    const { data: existingBook } = await supabase
      .from('books')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingBook) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    const { error } = await supabase.from('books').delete().eq('id', id);

    if (error) {
      throw new BadRequestException(`Failed to delete book: ${error.message}`);
    }
  }

  private validateUUID(id: string): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid UUID format');
    }
  }

  private mapToEntity(data: any): Book {
    return new Book({
      id: data.id,
      title: data.title,
      isbn: data.isbn,
      publishedDate: data.published_date
        ? new Date(data.published_date)
        : undefined,
      genre: data.genre,
      authorId: data.author_id,
      author: data.authors
        ? {
            id: data.authors.id,
            firstName: data.authors.first_name,
            lastName: data.authors.last_name,
            bio: data.authors.bio,
            birthDate: data.authors.birth_date
              ? new Date(data.authors.birth_date)
              : undefined,
            createdAt: new Date(data.authors.created_at),
            updatedAt: new Date(data.authors.updated_at),
          }
        : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });
  }
}
