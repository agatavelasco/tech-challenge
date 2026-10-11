import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AccessTokenPayload } from './auth.service.js';
import { IS_PUBLIC } from './public.decorator.js';

export type AuthenticatedRequest = Request & { user: AccessTokenPayload };

/**
 * Guard global: negar por padrão. Uma rota nova nasce protegida e só fica aberta
 * com @Public() explícito.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Os consumidores Kafka passam pelos mesmos guards no app híbrido; eles não têm token.
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Autenticação necessária');
    }

    try {
      request.user = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }
    return true;
  }
}
