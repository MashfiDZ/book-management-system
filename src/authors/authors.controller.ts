import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { QueryAuthorDto } from './dto/query-author.dto';

@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAuthorDto: CreateAuthorDto) {
    return await this.authorsService.create(createAuthorDto);
  }

  @Get()
    async findAll(@Query() query: QueryAuthorDto) {
    const result = await this.authorsService.findAll(query);
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '10');
    
    return {
        data: result.data,
        meta: {
        total: result.total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(result.total / limit),
        },
    };
}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.authorsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateAuthorDto: UpdateAuthorDto,
  ) {
    return await this.authorsService.update(id, updateAuthorDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.authorsService.remove(id);
  }
}
