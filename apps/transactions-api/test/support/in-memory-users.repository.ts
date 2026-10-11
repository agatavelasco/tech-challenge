import { randomUUID } from 'node:crypto';
import { type UserRecord, UsersRepository } from '../../src/auth/users.repository.js';

export class InMemoryUsersRepository extends UsersRepository {
  readonly users: UserRecord[] = [];

  findByEmail(email: string): Promise<UserRecord | null> {
    return Promise.resolve(this.users.find((user) => user.email === email.toLowerCase()) ?? null);
  }

  createIfMissing(email: string, passwordHash: string): Promise<boolean> {
    if (this.users.some((user) => user.email === email.toLowerCase()))
      return Promise.resolve(false);
    this.users.push({ id: randomUUID(), email: email.toLowerCase(), passwordHash });
    return Promise.resolve(true);
  }
}
