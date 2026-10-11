import { Controller, Get } from '@nestjs/common';

/** Usado pelo healthcheck do container. */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
