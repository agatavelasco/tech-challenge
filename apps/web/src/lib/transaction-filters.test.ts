import { filtersToQuery, filtersToSearchParams, parseFilters } from './transaction-filters';

describe('filtros da URL', () => {
  it('ignora valores inválidos editados à mão em vez de quebrar a tela', () => {
    const filters = parseFilters(
      new URLSearchParams('page=abc&status=cancelled&transferTypeId=-1&from=ontem'),
    );

    expect(filters).toEqual({ page: 1 });
  });

  it('ida e volta entre URL e filtros preserva os valores', () => {
    const params = new URLSearchParams(
      'page=2&pageSize=20&status=pending&transferTypeId=1&from=2026-10-01&to=2026-10-11',
    );

    expect(filtersToSearchParams(parseFilters(params)).toString()).toBe(params.toString());
  });

  it('o período cobre o dia inteiro no fuso local', () => {
    const query = filtersToQuery({ page: 1, from: '2026-10-01', to: '2026-10-01' });

    expect(new Date(query.createdFrom ?? '').getHours()).toBe(0);
    expect(new Date(query.createdTo ?? '').getHours()).toBe(23);
    expect(new Date(query.createdTo ?? '').getMinutes()).toBe(59);
  });

  it('aceita só os tamanhos de página oferecidos na tela', () => {
    expect(parseFilters(new URLSearchParams('pageSize=30')).pageSize).toBe(30);
    expect(parseFilters(new URLSearchParams('pageSize=50')).pageSize).toBeUndefined();
    expect(filtersToQuery(parseFilters(new URLSearchParams('pageSize=50'))).pageSize).toBe(10);
  });

  it('o tamanho padrão não aparece na URL', () => {
    expect(filtersToSearchParams({ page: 1, pageSize: 10 }).toString()).toBe('');
  });
});
