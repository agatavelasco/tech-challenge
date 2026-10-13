import { toDeadLetterMessage } from './dead-letter.js';

describe('toDeadLetterMessage', () => {
  it('envia para <tópico>.dlq preservando a chave, o motivo e o conteúdo original', () => {
    const message = toDeadLetterMessage(
      {
        sourceTopic: 'transaction.created',
        key: 'abc',
        reason: 'payload inválido',
        originalValue: { foo: 'bar' },
      },
      new Date('2026-10-11T12:00:00.000Z'),
    );

    expect(message).toEqual({
      topic: 'transaction.created.dlq',
      key: 'abc',
      value: {
        reason: 'payload inválido',
        failedAt: '2026-10-11T12:00:00.000Z',
        originalValue: { foo: 'bar' },
      },
      headers: { 'x-source-topic': 'transaction.created' },
    });
  });
});
