import { Module } from '@nestjs/common';
import { AntiFraudModule } from './anti-fraud/anti-fraud.module.js';
import { ConfigModule } from './config/config.module.js';
import { HealthController } from './health/health.controller.js';
import { MessagingModule } from './messaging/messaging.module.js';

@Module({
  imports: [ConfigModule, MessagingModule, AntiFraudModule],
  controllers: [HealthController],
})
export class AppModule {}
