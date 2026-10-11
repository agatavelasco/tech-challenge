import type { Kafka, Producer } from 'kafkajs';

export interface OutgoingMessage {
  topic: string;
  /** Mensagens com a mesma chave vão para a mesma partição e mantêm a ordem. */
  key: string;
  value: unknown;
  headers?: Record<string, string>;
}

export interface MessagePublisher {
  publish(messages: OutgoingMessage[]): Promise<void>;
}

/**
 * Producer idempotente com confirmação de todas as réplicas (acks = -1):
 * `publish` só resolve quando o Kafka garantiu a gravação, e lança em caso de falha
 * para que quem chamou decida entre tentar de novo ou desistir.
 *
 * A conexão é aberta no primeiro envio, e não na subida: o serviço continua de pé
 * (e aceitando escrita) mesmo com o broker indisponível.
 */
export class KafkaPublisher implements MessagePublisher {
  private readonly producer: Producer;
  private connection: Promise<void> | undefined;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;
    this.connection = undefined;
    await this.producer.disconnect();
  }

  async publish(messages: OutgoingMessage[]): Promise<void> {
    if (messages.length === 0) return;
    await this.ensureConnected();

    const byTopic = new Map<string, OutgoingMessage[]>();
    for (const message of messages) {
      byTopic.set(message.topic, [...(byTopic.get(message.topic) ?? []), message]);
    }

    await this.producer.sendBatch({
      acks: -1,
      topicMessages: [...byTopic].map(([topic, topicMessages]) => ({
        topic,
        messages: topicMessages.map((message) => ({
          key: message.key,
          value: JSON.stringify(message.value),
          headers: message.headers,
        })),
      })),
    });
  }

  private ensureConnected(): Promise<void> {
    this.connection ??= this.producer.connect().catch((error: unknown) => {
      this.connection = undefined;
      throw error;
    });
    return this.connection;
  }
}
