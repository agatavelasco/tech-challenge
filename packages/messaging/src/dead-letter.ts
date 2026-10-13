import { deadLetterTopic } from '@tech-challenge/contracts';
import type { MessagePublisher, OutgoingMessage } from './kafka-publisher.js';

export interface DeadLetter {
  sourceTopic: string;
  key: string | null;
  reason: string;
  originalValue: unknown;
}

export function toDeadLetterMessage(deadLetter: DeadLetter, failedAt: Date): OutgoingMessage {
  return {
    topic: deadLetterTopic(deadLetter.sourceTopic),
    key: deadLetter.key ?? 'sem-chave',
    value: {
      reason: deadLetter.reason,
      failedAt: failedAt.toISOString(),
      originalValue: deadLetter.originalValue,
    },
    headers: { 'x-source-topic': deadLetter.sourceTopic },
  };
}

export class DeadLetterPublisher {
  constructor(private readonly publisher: MessagePublisher) {}

  send(deadLetter: DeadLetter): Promise<void> {
    return this.publisher.publish([toDeadLetterMessage(deadLetter, new Date())]);
  }
}
