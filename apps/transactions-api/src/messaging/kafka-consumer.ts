import { type INestApplication, Logger } from '@nestjs/common';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { TOPICS, deadLetterTopic } from '@tech-challenge/contracts';
import { ensureTopics, retryUntilSuccess } from '@tech-challenge/messaging';
import { type Kafka, Partitioners } from 'kafkajs';
import type { AppConfig } from '../config/app-config.js';

export const TOPICS_OWNED = [
  TOPICS.transactionCreated,
  TOPICS.transactionStatusUpdated,
  deadLetterTopic(TOPICS.transactionStatusUpdated),
];

export function kafkaConsumerOptions(config: AppConfig): MicroserviceOptions {
  return {
    transport: Transport.KAFKA,
    options: {
      client: { clientId: `${config.KAFKA_CLIENT_ID}-transactions`, brokers: config.KAFKA_BROKERS },
      consumer: { groupId: config.KAFKA_GROUP_ID_TRANSACTIONS, allowAutoTopicCreation: false },
      subscribe: { fromBeginning: true },
      producer: { createPartitioner: Partitioners.DefaultPartitioner },
      // Sem sufixo: o group id é exatamente o configurado no ambiente.
      postfixId: '',
    },
  };
}

/**
 * Sobe o consumidor depois do HTTP e sem derrubar a API se o Kafka estiver fora:
 * a criação de transações continua funcionando (o outbox guarda os eventos) e o
 * consumidor entra assim que o broker responder.
 */
export async function startKafkaConsumer(
  app: INestApplication,
  kafka: Kafka,
  config: AppConfig,
): Promise<void> {
  const logger = new Logger('KafkaConsumer');
  await retryUntilSuccess(
    async () => {
      await ensureTopics(kafka, TOPICS_OWNED, config.KAFKA_TOPIC_PARTITIONS);
      await app.startAllMicroservices();
    },
    {
      onError: (error, attempt, delay) => {
        logger.warn(
          `Kafka indisponível (tentativa ${attempt}), nova tentativa em ${delay}ms: ${String(error)}`,
        );
      },
    },
  );
  logger.log('Consumidor Kafka ativo');
}
