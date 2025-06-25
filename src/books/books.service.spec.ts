import { Test, TestingModule } from '@nestjs/testing';
import { BooksService } from './books.service';
import { DatabaseConfig } from '../config/database.config';
import { AuthorsService } from '../authors/authors.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { QueryBookDto } from './dto/query-book.dto';
import { Author } from '../authors/entities/author.entity';

describe('BooksService', () => {
  let service: BooksService;
  let mockDatabaseConfig: DatabaseConfig;
  let mockAuthorsService: Partial<AuthorsService>;
  type MockClient = Record<string, jest.Mock>;
  let mockSupabaseClient: MockClient;

  const mockBookData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Book',
    isbn: '978-0-123456-78-9',
    published_date: '2023-01-01',
    genre: 'Test Genre',
    author_id: '123e4567-e89b-12d3-a456-426614174001',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
    authors: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      first_name: 'John',
      last_name: 'Doe',
      bio: 'Test bio',
      birth_date: '1990-01-01',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    },
  };

  beforeEach(async () => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      order: jest.fn(),
    };

    mockDatabaseConfig = {
      getClient: jest.fn().mockReturnValue(mockSupabaseClient),
    } as unknown as DatabaseConfig;

    mockAuthorsService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        {
          provide: DatabaseConfig,
          useValue: mockDatabaseConfig,
        },
        {
          provide: AuthorsService,
          useValue: mockAuthorsService,
        },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  describe('create', () => {
    it('should create a book successfully', async () => {
      const createBookDto: CreateBookDto = {
        title: 'Test Book',
        isbn: '978-0-123456-78-9',
        publishedDate: '2023-01-01',
        genre: 'Test Genre',
        authorId: '123e4567-e89b-12d3-a456-426614174001',
      };

      (mockAuthorsService.findOne as jest.Mock).mockResolvedValue({} as Author);
      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['single']
        .mockResolvedValueOnce({ data: null }) // ISBN check
        .mockResolvedValueOnce({ data: mockBookData, error: null }); // Create book

      const result = await service.create(createBookDto);

      expect(result.title).toBe('Test Book');
      expect(result.isbn).toBe('978-0-123456-78-9');
      expect(result.author).toBeDefined();
      expect(result.author.id).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(mockClient['from']).toHaveBeenCalledWith('books');
      expect(mockClient['insert']).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate ISBN', async () => {
      const createBookDto: CreateBookDto = {
        title: 'Test Book',
        isbn: '978-0-123456-78-9',
        authorId: '123e4567-e89b-12d3-a456-426614174001',
      };

      (mockAuthorsService.findOne as jest.Mock).mockResolvedValue({} as Author);
      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['single'].mockResolvedValueOnce({
        data: { isbn: '978-0-123456-78-9' },
      });

      await expect(service.create(createBookDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for non-existent author', async () => {
      const createBookDto: CreateBookDto = {
        title: 'Test Book',
        isbn: '978-0-123456-78-9',
        authorId: '123e4567-e89b-12d3-a456-426614174001',
      };

      (mockAuthorsService.findOne as jest.Mock).mockRejectedValue(
        new NotFoundException('Author not found'),
      );

      await expect(service.create(createBookDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated books', async () => {
      const query: QueryBookDto = { page: '1', limit: '10' };

      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['order'].mockResolvedValue({
        data: [mockBookData],
        error: null,
        count: 1,
      });

      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockClient['from']).toHaveBeenCalledWith('books');
      expect(mockClient['select']).toHaveBeenCalled();
      expect(mockClient['range']).toHaveBeenCalledWith(0, 9);
    });

    it('should filter by title', async () => {
      const query: QueryBookDto = { title: 'Test' };

      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['order'].mockResolvedValue({
        data: [mockBookData],
        error: null,
        count: 1,
      });

      await service.findAll(query);

      expect(mockClient['ilike']).toHaveBeenCalledWith('title', '%Test%');
    });

    it('should filter by authorId', async () => {
      const query: QueryBookDto = {
        authorId: '123e4567-e89b-12d3-a456-426614174001',
      };

      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['order'].mockResolvedValue({
        data: [mockBookData],
        error: null,
        count: 1,
      });

      await service.findAll(query);

      expect(mockClient['eq']).toHaveBeenCalledWith(
        'author_id',
        '123e4567-e89b-12d3-a456-426614174001',
      );
    });
  });

  describe('findOne', () => {
    it('should return a book by ID', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['single'].mockResolvedValue({
        data: mockBookData,
        error: null,
      });

      const result = await service.findOne(id);

      expect(result.id).toBe(id);
      expect(result.author).toBeDefined();
      expect(mockClient['eq']).toHaveBeenCalledWith('id', id);
    });

    it('should throw NotFoundException when book not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['single'].mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      const invalidId = 'invalid-uuid';

      await expect(service.findOne(invalidId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('should update a book successfully', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateBookDto: UpdateBookDto = {
        genre: 'Updated Genre',
      };

      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['single']
        .mockResolvedValueOnce({
          data: mockBookData,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockBookData, genre: 'Updated Genre' },
          error: null,
        });

      const result = await service.update(id, updateBookDto);

      expect(result.genre).toBe('Updated Genre');
      expect(mockClient['update']).toHaveBeenCalled();
    });

    it('should throw NotFoundException when book not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateBookDto: UpdateBookDto = { genre: 'Updated Genre' };

      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['single'].mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(service.update(id, updateBookDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should verify new author exists when updating authorId', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateBookDto: UpdateBookDto = {
        authorId: '123e4567-e89b-12d3-a456-426614174002',
      };

      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['single'].mockResolvedValueOnce({
        data: mockBookData,
        error: null,
      });

      (mockAuthorsService.findOne as jest.Mock).mockRejectedValue(
        new NotFoundException('Author not found'),
      );

      await expect(service.update(id, updateBookDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a book successfully', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      const mockClient =
        mockDatabaseConfig.getClient() as unknown as MockClient;
      mockClient['single'].mockResolvedValue({
        data: mockBookData,
        error: null,
      });

      await service.remove(id);

      expect(mockClient['from']).toHaveBeenCalledWith('books');
      expect(mockClient['delete']).toHaveBeenCalled();
      expect(mockClient['eq']).toHaveBeenCalledWith('id', id);
    });

    it('should throw NotFoundException when book not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['single'].mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
