import { transactionCreatedEventSchema } from '@tech-challenge/contracts';
import { transactionCreatedMessage } from './transaction-events.js';

describe('transactionCreatedMessage', () => {
  it('monta um evento válido segundo o contrato', () => {
    const message = transactionCreatedMessage({
      id: '01a12c49-2a9b-7529-b23c-05f14ddd4710',
      accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      accountExternalIdCredit: '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f',
      transferType: { id: 1, name: 'Pix' },
      value: 1500,
      status: 'pending',
      createdAt: new Date('2026-10-11T12:00:00.000Z'),
    });

    const event = transactionCreatedEventSchema.parse(message.payload);
    expect(event.eventId).toBe(message.eventId);
    expect(event.occurredAt).toBe('2026-10-11T12:00:00.000Z');
    expect(message.key).toBe('01a12c49-2a9b-7529-b23c-05f14ddd4710');
  });
});
