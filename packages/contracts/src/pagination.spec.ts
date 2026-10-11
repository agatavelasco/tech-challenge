import { DEFAULT_PAGE_SIZE, listTransactionsQuerySchema, MAX_PAGE_SIZE } from './pagination.js';

describe('listTransactionsQuerySchema', () => {
  it('aplica página 1 e tamanho padrão quando a query vem vazia', () => {
    expect(listTransactionsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('converte os valores da query string', () => {
    expect(
      listTransactionsQuerySchema.parse({ page: '3', pageSize: '20', transferTypeId: '2' }),
    ).toMatchObject({ page: 3, pageSize: 20, transferTypeId: 2 });
  });

  it('limita o tamanho da página', () => {
    expect(
      listTransactionsQuerySchema.safeParse({ pageSize: String(MAX_PAGE_SIZE + 1) }).success,
    ).toBe(false);
  });

  it('rejeita status desconhecido', () => {
    expect(listTransactionsQuerySchema.safeParse({ status: 'cancelled' }).success).toBe(false);
  });

  it('rejeita período com data inicial depois da final', () => {
    const result = listTransactionsQuerySchema.safeParse({
      createdFrom: '2026-10-11T00:00:00Z',
      createdTo: '2026-10-10T00:00:00Z',
    });

    expect(result.success).toBe(false);
  });

  it('compara datas pelo instante, não pelo texto', () => {
    const result = listTransactionsQuerySchema.safeParse({
      createdFrom: '2026-10-11T00:00:00Z',
      createdTo: '2026-10-11T00:00:00.000Z',
    });

    expect(result.success).toBe(true);
  });
});
