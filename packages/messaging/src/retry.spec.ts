import { retryUntilSuccess } from './retry.js';

describe('retryUntilSuccess', () => {
  it('repete com espera exponencial limitada até a operação dar certo', async () => {
    let calls = 0;
    const delays: number[] = [];

    const result = await retryUntilSuccess(
      () => {
        calls++;
        return calls < 4 ? Promise.reject(new Error('indisponível')) : Promise.resolve('ok');
      },
      {
        initialDelayMs: 1,
        maxDelayMs: 3,
        onError: (_error, _attempt, delay) => delays.push(delay),
      },
    );

    expect(result).toBe('ok');
    expect(delays).toEqual([1, 2, 3]);
  });

  it('desiste quando o sinal de cancelamento foi acionado', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      retryUntilSuccess(() => Promise.reject(new Error('indisponível')), {
        signal: controller.signal,
      }),
    ).rejects.toThrow('indisponível');
  });
});
