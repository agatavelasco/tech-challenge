import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { DeadLetterPublisher, KafkaPublisher } from '@tech-challenge/messaging';
import { Kafka, logLevel } from 'kafkajs';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';

export const KAFKA = Symbol('KAFKA');

@Global()
@Module({
  providers: [
    {
      provide: KAFKA,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new Kafka({
          clientId: config.KAFKA_CLIENT_ID,
          brokers: config.KAFKA_BROKERS,
          logLevel: logLevel.WARN,
        }),
    },
    {
      provide: KafkaPublisher,
      inject: [KAFKA],
      useFactory: (kafka: Kafka) => new KafkaPublisher(kafka),
    },
    {
      provide: DeadLetterPublisher,
      inject: [KafkaPublisher],
      useFactory: (publisher: KafkaPublisher) => new DeadLetterPublisher(publisher),
    },
  ],
  exports: [KAFKA, KafkaPublisher, DeadLetterPublisher],
})
export class MessagingModule implements OnApplicationShutdown {
  constructor(@Inject(KafkaPublisher) private readonly publisher: KafkaPublisher) {}

  async onApplicationShutdown(): Promise<void> {
    await this.publisher.disconnect();
  }
}
