# Advanced Book Management System

A production-ready RESTful API built with NestJS and Supabase, demonstrating modern backend development practices, clean architecture, and comprehensive testing.

## Technical Highlights

### Advanced Database Implementation
- PostgreSQL with Supabase: Leveraging enterprise-grade database features
- Sophisticated Query Handling: Case-insensitive search with `ilike`, efficient pagination
- Relationship Management: Proper handling of Author-Book relationships with referential integrity
- UUID Implementation: Secure, distributed-friendly unique identifiers with validation

### Clean Architecture & Best Practices
- Domain-Driven Design: Clear separation of entities, DTOs, and business logic
- SOLID Principles: Single responsibility, interface segregation in services
- Repository Pattern: Abstracted database operations via Supabase client
- Dependency Injection: Proper use of NestJS DI container

### Robust Error Handling
- Custom Exception Filters: Consistent error response format
- Validation Pipeline: Comprehensive DTO validation using class-validator
- Business Logic Validation: ISBN uniqueness, UUID format, relationship integrity
- HTTP Status Codes: Proper use of 201, 204, 400, 404 status codes

### Advanced Testing Implementation
- Unit Tests: Comprehensive service testing with mocked dependencies
- E2E Tests: Complete API testing with database integration
- Complex Scenarios: Testing of intricate business logic and edge cases
- Test Data Management: Proper setup and teardown of test data

## API Endpoints

### Authors

#### Create Author
```
POST /authors
```
Request:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Author bio",
  "birthDate": "1990-01-01"
}
```
Response (201):
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Author bio",
  "birthDate": "1990-01-01",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### List Authors
```
GET /authors?firstName=John&lastName=Doe&page=1&limit=10
```
Response (200):
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "firstName": "John",
      "lastName": "Doe",
      "bio": "Author bio",
      "birthDate": "1990-01-01",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

#### Get Single Author
```
GET /authors/:id
```
Response (200): Same as create author response

#### Update Author
```
PATCH /authors/:id
```
Request:
```json
{
  "bio": "Updated author bio"
}
```
Response (200): Updated author object

#### Delete Author
```
DELETE /authors/:id
```
Response (204): No content

### Books

#### Create Book
```
POST /books
```
Request:
```json
{
  "title": "Advanced TypeScript Patterns",
  "isbn": "978-3-16-148410-0",
  "publishedDate": "2023-01-01",
  "genre": "Programming",
  "authorId": "123e4567-e89b-12d3-a456-426614174000"
}
```
Response (201):
```json
{
  "id": "987fcdeb-51a2-43b7-89ab-765432198000",
  "title": "Advanced TypeScript Patterns",
  "isbn": "978-3-16-148410-0",
  "publishedDate": "2023-01-01",
  "genre": "Programming",
  "author": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "firstName": "John",
    "lastName": "Doe"
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

#### List Books
```
GET /books?title=Pattern&genre=Programming&authorId=123e4567-e89b-12d3-a456-426614174000&page=1&limit=10
```
Response (200):
```json
{
  "data": [
    {
      "id": "987fcdeb-51a2-43b7-89ab-765432198000",
      "title": "Advanced TypeScript Patterns",
      "isbn": "978-3-16-148410-0",
      "publishedDate": "2023-01-01",
      "genre": "Programming",
      "author": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "firstName": "John",
        "lastName": "Doe"
      },
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

## Technical Stack

- Framework: NestJS with TypeScript
- Database: PostgreSQL via Supabase
- Validation: class-validator & class-transformer
- Testing: Jest & Supertest
- Documentation: Comprehensive E2E tests as living documentation

## Environment Setup

Create `.env.local` in the root directory:
```env
SUPABASE_URL=https://lijbmbdbpceukaejreoa.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpamJtYmRicGNldWthZWpyZW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTM5NTIsImV4cCI6MjA2NjI2OTk1Mn0._QCO4QqVP3giXDk41LGgzjAMkTvtbLi9gZnmpPkgej8
```

## Installation & Setup

```bash
# Install dependencies with exact versions
npm ci

# Development
npm run start

# Testing
npm run test        # Unit tests with coverage
npm run test:e2e    # Integration tests
```

## Architecture

### Clean Code Structure
```
src/
├── authors/                # Authors domain
│   ├── dto/               # Data transfer objects
│   │   ├── create-author.dto.ts
│   │   └── update-author.dto.ts
│   ├── entities/          # Domain entities
│   └── authors.service.ts # Business logic
├── books/                 # Books domain
└── config/               # Infrastructure
```

### Advanced Implementation Details

#### Sophisticated Error Handling
```typescript
// Example of business logic validation
if (!uuidRegex.test(id)) {
  throw new BadRequestException('Invalid UUID format');
}

// Example of unique constraint handling
if (existingBook) {
  throw new BadRequestException(`Book with ISBN ${isbn} already exists`);
}
```

#### Rich Query Support
```typescript
// Example of advanced query building with pagination and search
const queryBuilder = supabase
  .from('books')
  .select(`
    *,
    authors (
      id,
      first_name,
      last_name,
      bio,
      birth_date
    )
  `, { count: 'exact' })
  .ilike('title', `%${query.title}%`)
  .eq('author_id', query.authorId)
  .range(offset, offset + limit - 1)
  .order('created_at', { ascending: false });
```

## Testing Philosophy

### Comprehensive Test Coverage
- Unit Tests: Testing business logic in isolation
- Integration Tests: Testing database operations
- E2E Tests: Testing complete request/response cycles
- Edge Cases: Testing error conditions and boundary scenarios

### Example Test Scenario
```typescript
describe('Books API', () => {
  it('should handle complex author-book relationships', async () => {
    // Create test author
    const author = await request(app.getHttpServer())
      .post('/authors')
      .send({
        firstName: 'Test',
        lastName: 'Author',
        bio: 'Test bio'
      })
      .expect(201);
    
    // Create multiple books for author
    const book1 = await request(app.getHttpServer())
      .post('/books')
      .send({
        title: 'First Book',
        isbn: '978-0-123456-78-9',
        authorId: author.body.id
      })
      .expect(201);
    
    const book2 = await request(app.getHttpServer())
      .post('/books')
      .send({
        title: 'Second Book',
        isbn: '978-0-123456-78-0',
        authorId: author.body.id
      })
      .expect(201);
    
    // Verify author's books
    const response = await request(app.getHttpServer())
      .get(`/books?authorId=${author.body.id}`)
      .expect(200);
    
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.total).toBe(2);
  });
});
```

## Security Considerations

- UUID for secure resource identification
- Input validation for all endpoints
- Proper error message sanitization
- Database query parameterization

## Performance Optimizations

- Efficient pagination implementation
- Proper database indexing
- Optimized relationship queries
- Response caching considerations
