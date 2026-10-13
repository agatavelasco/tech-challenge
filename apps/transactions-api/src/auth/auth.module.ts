import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { DemoUserSeeder } from './demo-user.seeder.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { DEFAULT_SCRYPT_COST, PasswordHasher, SCRYPT_COST } from './password-hasher.js';
import { PrismaUsersRepository, UsersRepository } from './users.repository.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.JWT_SECRET,
        signOptions: { expiresIn: config.JWT_EXPIRES_IN_SECONDS, algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordHasher,
    { provide: SCRYPT_COST, useValue: DEFAULT_SCRYPT_COST },
    DemoUserSeeder,
    { provide: UsersRepository, useClass: PrismaUsersRepository },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
