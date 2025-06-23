import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseConfig } from '../config/database.config';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { QueryAuthorDto } from './dto/query-author.dto';
import { Author } from './entities/author.entity';

@Injectable()
export class AuthorsService {
  constructor(private readonly databaseConfig: DatabaseConfig) {}

  async create(createAuthorDto: CreateAuthorDto): Promise<Author> {
    const supabase = this.databaseConfig.getClient();

    const { data, error } = await supabase
      .from('authors')
      .insert([
        {
          first_name: createAuthorDto.firstName,
          last_name: createAuthorDto.lastName,
          bio: createAuthorDto.bio,
          birth_date: createAuthorDto.birthDate,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to create author: ${error.message}`,
      );
    }

    return this.mapToEntity(data);
  }

  async findAll(
    query: QueryAuthorDto,
  ): Promise<{ data: Author[]; total: number }> {
    const supabase = this.databaseConfig.getClient();
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase.from('authors').select('*', { count: 'exact' });

    // Add search filters
    if (query.firstName) {
      queryBuilder = queryBuilder.ilike('first_name', `%${query.firstName}%`);
    }
    if (query.lastName) {
      queryBuilder = queryBuilder.ilike('last_name', `%${query.lastName}%`);
    }

    // Add pagination
    queryBuilder = queryBuilder
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new BadRequestException(
        `Failed to fetch authors: ${error.message}`,
      );
    }

    return {
      data: data.map((item) => this.mapToEntity(item)),
      total: count || 0,
    };
  }

  async findOne(id: string): Promise<Author> {
    this.validateUUID(id);
    const supabase = this.databaseConfig.getClient();

    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }

    return this.mapToEntity(data);
  }

  async update(id: string, updateAuthorDto: UpdateAuthorDto): Promise<Author> {
    this.validateUUID(id);

    // Check if author exists first
    await this.findOne(id);

    const supabase = this.databaseConfig.getClient();

    const updateData: any = {};
    if (updateAuthorDto.firstName !== undefined)
      updateData.first_name = updateAuthorDto.firstName;
    if (updateAuthorDto.lastName !== undefined)
      updateData.last_name = updateAuthorDto.lastName;
    if (updateAuthorDto.bio !== undefined) updateData.bio = updateAuthorDto.bio;
    if (updateAuthorDto.birthDate !== undefined)
      updateData.birth_date = updateAuthorDto.birthDate;

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return this.findOne(id);
    }

    const { data, error } = await supabase
      .from('authors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to update author: ${error.message}`,
      );
    }

    return this.mapToEntity(data);
  }

  async remove(id: string): Promise<void> {
    this.validateUUID(id);
    const supabase = this.databaseConfig.getClient();

    // First check if author exists
    const { data: existingAuthor } = await supabase
      .from('authors')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingAuthor) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }

    const { error } = await supabase.from('authors').delete().eq('id', id);

    if (error) {
      throw new BadRequestException(
        `Failed to delete author: ${error.message}`,
      );
    }
  }

  private validateUUID(id: string): void {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException('Invalid UUID format');
    }
  }

  private mapToEntity(data: any): Author {
    return new Author({
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      bio: data.bio,
      birthDate: data.birth_date ? new Date(data.birth_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });
  }
}
