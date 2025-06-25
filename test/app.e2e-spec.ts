import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { Author } from '../src/authors/entities/author.entity';
import { Book } from '../src/books/entities/book.entity';
import { CreateAuthorDto } from '../src/authors/dto/create-author.dto';
import { CreateBookDto } from '../src/books/dto/create-book.dto';
import { DatabaseConfig } from '../src/config/database.config';
import { SupabaseClient } from '@supabase/supabase-js';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

describe('Book Management System (e2e)', () => {
  let app: INestApplication;
  let authorId: string;
  let bookId: string;
  let supabase: SupabaseClient;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    // Get Supabase client
    const databaseConfig = app.get(DatabaseConfig);
    supabase = databaseConfig.getClient();

    // Clean up database
    await supabase.from('books').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('authors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    await app.init();
  }, 10000); // Increased timeout

  afterAll(async () => {
    await app.close();
  }, 10000); // Increased timeout

  describe('Authors API', () => {
    describe('POST /authors', () => {
      it('should create an author successfully', async () => {
        const createAuthorDto: CreateAuthorDto = {
          firstName: 'Test',
          lastName: 'Author',
          bio: 'A test author for E2E testing',
          birthDate: '1980-01-01',
        };

        const response = await request(app.getHttpServer())
          .post('/authors')
          .send(createAuthorDto)
          .expect(201);

        const author = response.body as Author;
        authorId = author.id;
        expect(author.firstName).toBe('Test');
        expect(author.lastName).toBe('Author');
        expect(author.bio).toBe('A test author for E2E testing');
        expect(author.id).toBeDefined();
        expect(author.createdAt).toBeDefined();
        expect(author.updatedAt).toBeDefined();
      });

      it('should return 400 for invalid author data', async () => {
        const invalidAuthorDto: Partial<CreateAuthorDto> = {
          firstName: '',
          lastName: 'Author',
        };

        await request(app.getHttpServer())
          .post('/authors')
          .send(invalidAuthorDto)
          .expect(400);
      });
    });

    describe('GET /authors', () => {
      it('should return list of authors with pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/authors')
          .expect(200);

        const result = response.body as PaginatedResponse<Author>;
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.meta).toBeDefined();
        expect(result.meta.total).toBeGreaterThan(0);
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
      });

      it('should support pagination parameters', async () => {
        const response = await request(app.getHttpServer())
          .get('/authors?page=1&limit=5')
          .expect(200);

        const result = response.body as PaginatedResponse<Author>;
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(5);
      });

      it('should support search by firstName', async () => {
        const response = await request(app.getHttpServer())
          .get('/authors?firstName=Test')
          .expect(200);

        const result = response.body as PaginatedResponse<Author>;
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0].firstName).toContain('Test');
      });
    });

    describe('GET /authors/:id', () => {
      it('should return a single author by ID', async () => {
        const response = await request(app.getHttpServer())
          .get(`/authors/${authorId}`)
          .expect(200);

        const author = response.body as Author;
        expect(author.id).toBe(authorId);
        expect(author.firstName).toBe('Test');
        expect(author.lastName).toBe('Author');
      });

      it('should return 404 for non-existent author', async () => {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
        await request(app.getHttpServer())
          .get(`/authors/${nonExistentId}`)
          .expect(404);
      });

      it('should return 400 for invalid UUID format', async () => {
        await request(app.getHttpServer())
          .get('/authors/invalid-uuid')
          .expect(400);
      });
    });

    describe('PATCH /authors/:id', () => {
      it('should update an author successfully', async () => {
        const updateData = {
          bio: 'Updated bio for E2E testing',
        };

        const response = await request(app.getHttpServer())
          .patch(`/authors/${authorId}`)
          .send(updateData)
          .expect(200);

        const author = response.body as Author;
        expect(author.bio).toBe('Updated bio for E2E testing');
        expect(author.id).toBe(authorId);
      });

      it('should return 404 for non-existent author', async () => {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
        await request(app.getHttpServer())
          .patch(`/authors/${nonExistentId}`)
          .send({ bio: 'Updated bio' })
          .expect(404);
      });
    });
  });

  describe('Books API', () => {
    describe('POST /books', () => {
      it('should create a book successfully with valid author', async () => {
        const createBookDto: CreateBookDto = {
          title: 'Test Book for E2E',
          isbn: '978-0-123456-78-9',
          publishedDate: '2023-01-01',
          genre: 'Test Genre',
          authorId,
        };

        const response = await request(app.getHttpServer())
          .post('/books')
          .send(createBookDto)
          .expect(201);

        const book = response.body as Book;
        bookId = book.id;
        expect(book.title).toBe('Test Book for E2E');
        expect(book.isbn).toBe('978-0-123456-78-9');
        expect(book.author).toBeDefined();
        expect(book.author.id).toBe(authorId);
        expect(book.author.firstName).toBe('Test');
      });

      it('should return 404 for non-existent author', async () => {
        const createBookDto: CreateBookDto = {
          title: 'Test Book',
          isbn: '978-0-123456-78-8',
          authorId: '123e4567-e89b-12d3-a456-426614174000',
        };

        await request(app.getHttpServer())
          .post('/books')
          .send(createBookDto)
          .expect(404);
      });

      it('should return 400 for duplicate ISBN', async () => {
        const createBookDto: CreateBookDto = {
          title: 'Another Test Book',
          isbn: '978-0-123456-78-9',
          authorId,
        };

        await request(app.getHttpServer())
          .post('/books')
          .send(createBookDto)
          .expect(400);
      });

      it('should return 400 for invalid book data', async () => {
        const invalidBookDto: Partial<CreateBookDto> = {
          title: '',
          isbn: 'invalid-isbn',
          authorId,
        };

        await request(app.getHttpServer())
          .post('/books')
          .send(invalidBookDto)
          .expect(400);
      });
    });

    describe('GET /books', () => {
      it('should return list of books with author information', async () => {
        const response = await request(app.getHttpServer())
          .get('/books')
          .expect(200);

        const result = response.body as PaginatedResponse<Book>;
        expect(result.data).toBeDefined();
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);

        const book = result.data[0];
        expect(book.author).toBeDefined();
        expect(book.author.firstName).toBeDefined();
        expect(book.author.lastName).toBeDefined();
      });

      it('should support filtering by authorId', async () => {
        const response = await request(app.getHttpServer())
          .get(`/books?authorId=${authorId}`)
          .expect(200);

        const result = response.body as PaginatedResponse<Book>;
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0].author.id).toBe(authorId);
      });

      it('should support search by title', async () => {
        const response = await request(app.getHttpServer())
          .get('/books?title=Test Book')
          .expect(200);

        const result = response.body as PaginatedResponse<Book>;
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0].title).toContain('Test Book');
      });

      it('should handle pagination edge cases', async () => {
        // Test with invalid page number - should return 400
        await request(app.getHttpServer())
          .get('/books')
          .query({ page: '-1' })
          .expect(400);

        // Test with zero limit (should use default limit)
        const zeroLimitResponse = await request(app.getHttpServer())
          .get('/books')
          .query({ limit: '0' })
          .expect(200);

        const zeroLimitResult = zeroLimitResponse.body as PaginatedResponse<Book>;
        expect(zeroLimitResult.meta).toBeDefined();
        expect(zeroLimitResult.meta.limit).toBeDefined();

        // Test with page beyond available data
        const countResponse = await request(app.getHttpServer())
          .get('/books')
          .expect(200);

        const totalPages = Math.ceil(countResponse.body.meta.total / 10);
        const beyondPage = (totalPages + 1).toString();

        const beyondResponse = await request(app.getHttpServer())
          .get('/books')
          .query({ page: beyondPage })
          .expect(200);

        const beyondResult = beyondResponse.body as PaginatedResponse<Book>;
        expect(beyondResult.data).toHaveLength(0);
        expect(beyondResult.meta.total).toBeDefined();
      });
    });

    describe('GET /books/:id', () => {
      it('should return a single book with author information', async () => {
        const response = await request(app.getHttpServer())
          .get(`/books/${bookId}`)
          .expect(200);

        const book = response.body as Book;
        expect(book.id).toBe(bookId);
        expect(book.title).toBe('Test Book for E2E');
        expect(book.author).toBeDefined();
        expect(book.author.id).toBe(authorId);
        expect(book.author.firstName).toBe('Test');
      });

      it('should return 404 for non-existent book', async () => {
        const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
        await request(app.getHttpServer())
          .get(`/books/${nonExistentId}`)
          .expect(404);
      });
    });

    describe('Complex Author-Book Scenarios', () => {
      it('should create an author and multiple books', async () => {
        // Create a new author
        const createAuthorDto: CreateAuthorDto = {
          firstName: 'Multi',
          lastName: 'Author',
          bio: 'Author with multiple books',
          birthDate: '1990-01-01',
        };

        const authorResponse = await request(app.getHttpServer())
          .post('/authors')
          .send(createAuthorDto)
          .expect(201);

        const newAuthor = authorResponse.body as Author;
        const newAuthorId = newAuthor.id;

        // Wait for author to be fully created
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Create books with unique ISBNs
        const books: CreateBookDto[] = [
          {
            title: 'First Book',
            isbn: '978-0-123456-00-1', // New unique ISBN
            publishedDate: '2023-01-01',
            genre: 'Fiction',
            authorId: newAuthorId,
          },
          {
            title: 'Second Book',
            isbn: '978-0-123456-00-2', // New unique ISBN
            publishedDate: '2023-02-01',
            genre: 'Fiction',
            authorId: newAuthorId,
          },
          {
            title: 'Third Book',
            isbn: '978-0-123456-00-3', // New unique ISBN
            publishedDate: '2023-03-01',
            genre: 'Non-Fiction',
            authorId: newAuthorId,
          },
        ];

        // Create books one by one with longer delay between requests
        for (const bookData of books) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Increased delay to 2 seconds
          const bookResponse = await request(app.getHttpServer())
            .post('/books')
            .send(bookData)
            .expect(201);

          const book = bookResponse.body as Book;
          expect(book.author.id).toBe(newAuthorId);
        }

        // Wait before verifying books
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Verify all books are listed under the author
        const booksResponse = await request(app.getHttpServer())
          .get('/books')
          .query({ authorId: newAuthorId })
          .expect(200);

        const booksResult = booksResponse.body as PaginatedResponse<Book>;
        expect(booksResult.data).toHaveLength(3);
        expect(
          booksResult.data.every((book) => book.author.id === newAuthorId),
        ).toBe(true);

        // Clean up
        for (const book of booksResult.data) {
          await request(app.getHttpServer())
            .delete(`/books/${book.id}`)
            .expect(204);
        }

        await request(app.getHttpServer())
          .delete(`/authors/${newAuthorId}`)
          .expect(204);
      }, 30000); // Keep increased timeout

      it('should handle duplicate ISBN creation', async () => {
        const baseBookDto: Omit<CreateBookDto, 'isbn'> = {
          title: 'Duplicate ISBN Test',
          publishedDate: '2023-01-01',
          genre: 'Fiction',
          authorId,
        };

        // Create first book with unique ISBN
        const firstBookResponse = await request(app.getHttpServer())
          .post('/books')
          .send({
            ...baseBookDto,
            title: 'First Book',
            isbn: '978-0-123456-99-9', // New unique ISBN
          } as CreateBookDto)
          .expect(201);

        const firstBook = firstBookResponse.body as Book;

        // Try to create second book with same ISBN
        await request(app.getHttpServer())
          .post('/books')
          .send({
            ...baseBookDto,
            title: 'Second Book',
            isbn: '978-0-123456-99-9', // Same ISBN as first book
          } as CreateBookDto)
          .expect(400);

        // Clean up
        await request(app.getHttpServer())
          .delete(`/books/${firstBook.id}`)
          .expect(204);
      });
    });

    describe('DELETE /books/:id', () => {
      it('should delete a book successfully', async () => {
        await request(app.getHttpServer())
          .delete(`/books/${bookId}`)
          .expect(204);

        // Verify book is deleted
        await request(app.getHttpServer())
          .get(`/books/${bookId}`)
          .expect(404);
      }, 10000); // Increased timeout
    });
  });

  describe('DELETE /authors/:id', () => {
    it('should delete an author successfully', async () => {
      // First verify no books exist for this author
      const booksResponse = await request(app.getHttpServer())
        .get('/books')
        .query({ authorId })
        .expect(200);

      const booksResult = booksResponse.body as PaginatedResponse<Book>;

      // Delete any remaining books
      for (const book of booksResult.data) {
        await request(app.getHttpServer())
          .delete(`/books/${book.id}`)
          .expect(204);
      }

      // Then delete the author
      await request(app.getHttpServer())
        .delete(`/authors/${authorId}`)
        .expect(204);

      // Verify author is deleted
      await request(app.getHttpServer())
        .get(`/authors/${authorId}`)
        .expect(404);
    }, 10000); // Increased timeout
  });
});
