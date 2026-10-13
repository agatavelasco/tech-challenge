import { evaluateTransaction } from './anti-fraud.rule.js';

describe('evaluateTransaction', () => {
  it.each([
    [0.01, 'approved'],
    [120, 'approved'],
    [1000, 'approved'],
    [1000.01, 'rejected'],
    [1500, 'rejected'],
  ])('valor %s → %s', (value, expected) => {
    expect(evaluateTransaction(value)).toBe(expected);
  });
});
