import { Test, TestingModule } from '@nestjs/testing';
import { AuthorsService } from './authors.service';
import { DatabaseConfig } from '../config/database.config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { QueryAuthorDto } from './dto/query-author.dto';
import { Author } from './entities/author.entity';

describe('AuthorsService', () => {
  let service: AuthorsService;
  let mockDatabaseConfig: DatabaseConfig;
  let mockSupabaseClient: Record<string, jest.Mock>;

  const mockAuthorData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    first_name: 'John',
    last_name: 'Doe',
    bio: 'Test bio',
    birth_date: '1990-01-01',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorsService,
        {
          provide: DatabaseConfig,
          useValue: mockDatabaseConfig,
        },
      ],
    }).compile();

    service = module.get<AuthorsService>(AuthorsService);
  });

  describe('create', () => {
    it('should create an author successfully', async () => {
      const createAuthorDto: CreateAuthorDto = {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Test bio',
        birthDate: '1990-01-01',
      };

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['single'].mockResolvedValue({
        data: mockAuthorData,
        error: null,
      });

      const result = await service.create(createAuthorDto);

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(mockClient['from']).toHaveBeenCalledWith('authors');
      expect(mockClient['insert']).toHaveBeenCalled();
    });

    it('should throw BadRequestException on database error', async () => {
      const createAuthorDto: CreateAuthorDto = {
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['single'].mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(service.create(createAuthorDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated authors', async () => {
      const query: QueryAuthorDto = { page: '1', limit: '10' };

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['order'].mockResolvedValue({
        data: [mockAuthorData],
        error: null,
        count: 1,
      });

      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockClient['from']).toHaveBeenCalledWith('authors');
      expect(mockClient['select']).toHaveBeenCalled();
      expect(mockClient['range']).toHaveBeenCalledWith(0, 9);
    });

    it('should filter by firstName', async () => {
      const query: QueryAuthorDto = { firstName: 'John' };

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['order'].mockResolvedValue({
        data: [mockAuthorData],
        error: null,
        count: 1,
      });

      await service.findAll(query);

      expect(mockClient['ilike']).toHaveBeenCalledWith('first_name', '%John%');
    });

    it('should handle database error in findAll', async () => {
      const query: QueryAuthorDto = { page: '1', limit: '10' };

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['order'].mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
        count: 0,
      });

      await expect(service.findAll(query)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return an author by ID', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['single'].mockResolvedValue({
        data: mockAuthorData,
        error: null,
      });

      const result = await service.findOne(id);

      expect(result.id).toBe(id);
      expect(mockClient['eq']).toHaveBeenCalledWith('id', id);
    });

    it('should throw NotFoundException when author not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
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
    it('should update an author successfully', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateAuthorDto: UpdateAuthorDto = {
        bio: 'Updated bio',
      };

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['single']
        .mockResolvedValueOnce({
          data: mockAuthorData,
          error: null,
        })
        .mockResolvedValueOnce({
          data: { ...mockAuthorData, bio: 'Updated bio' },
          error: null,
        });

      const result = await service.update(id, updateAuthorDto);

      expect(result.bio).toBe('Updated bio');
      expect(mockClient['update']).toHaveBeenCalled();
    });

    it('should throw NotFoundException when author not found', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      const updateAuthorDto: UpdateAuthorDto = { bio: 'Updated bio' };

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['single'].mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      await expect(service.update(id, updateAuthorDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an author successfully', async () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';

      const mockClient = mockDatabaseConfig.getClient() as unknown as Record<
        string,
        jest.Mock
      >;
      mockClient['single'].mockResolvedValue({
        data: mockAuthorData,
        error: null,
      });

      await service.remove(id);

      expect(mockClient['from']).toHaveBeenCalledWith('authors');
      expect(mockClient['delete']).toHaveBeenCalled();
      expect(mockClient['eq']).toHaveBeenCalledWith('id', id);
    });

    it('should throw NotFoundException when author not found', async () => {
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
