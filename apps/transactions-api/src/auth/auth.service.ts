import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginInput, LoginResponse } from '@tech-challenge/contracts';
import { PasswordHasher } from './password-hasher.js';
import { UsersRepository } from './users.repository.js';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';

@Injectable()
export class AuthService {
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
  ) {
    this.dummyHash = hasher.hash('senha-que-nunca-confere');
  }

  async login({ email, password }: LoginInput): Promise<LoginResponse> {
    const user = await this.users.findByEmail(email);
    const passwordMatches = await this.hasher.verify(
      password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const payload: AccessTokenPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);
    const { exp, iat } = this.jwt.decode<{ exp: number; iat: number }>(accessToken);
    return { accessToken, expiresIn: exp - iat };
  }
}
