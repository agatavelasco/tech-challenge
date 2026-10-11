import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

export abstract class UsersRepository {
  abstract findByEmail(email: string): Promise<UserRecord | null>;
  /** Cria se não existir; não altera a senha de um usuário existente. */
  abstract createIfMissing(email: string, passwordHash: string): Promise<boolean>;
}

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true },
    });
  }

  async createIfMissing(email: string, passwordHash: string): Promise<boolean> {
    const { count } = await this.prisma.user.createMany({
      data: [{ email: email.toLowerCase(), passwordHash }],
      skipDuplicates: true,
    });
    return count === 1;
  }
}
