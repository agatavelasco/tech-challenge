import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { loginSchema, type LoginInput, type LoginResponse } from '@tech-challenge/contracts';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodValidationPipe(loginSchema)) input: LoginInput): Promise<LoginResponse> {
    return this.authService.login(input);
  }
}
