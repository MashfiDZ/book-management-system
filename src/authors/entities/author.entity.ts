export class Author {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  birthDate?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<Author>) {
    Object.assign(this, partial);
  }
}
