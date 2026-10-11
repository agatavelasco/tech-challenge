import type { Kafka, Producer } from 'kafkajs';

export interface OutgoingMessage {
  topic: string;
  /** Mensagens com a mesma chave vão para a mesma partição e mantêm a ordem. */
  key: string;
  value: unknown;
  headers?: Record<string, string>;
}

/**
 * Producer idempotente com confirmação de todas as réplicas (acks = -1):
 * `publish` só resolve quando o Kafka garantiu a gravação, e lança em caso de falha
 * para que quem chamou decida entre tentar de novo ou desistir.
 */
export class KafkaPublisher {
  private readonly producer: Producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
  }

  connect(): Promise<void> {
    return this.producer.connect();
  }

  disconnect(): Promise<void> {
    return this.producer.disconnect();
  }

  async publish(messages: OutgoingMessage[]): Promise<void> {
    if (messages.length === 0) return;

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
}
