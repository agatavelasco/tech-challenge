import { formatCurrencyInput, parseCurrencyInput } from './currency-mask';

const brl = (text: string) => text.replace(' ', ' ');

describe('máscara de moeda', () => {
  it.each([
    ['1', 0.01],
    ['150075', 1500.75],
    ['R$ 1.000,00', 1000],
    ['R$ 1.000,001', 10000.01],
    ['abc', undefined],
    ['R$ 0,00', undefined],
    ['', undefined],
  ])('"%s" vira %s', (text, expected) => {
    expect(parseCurrencyInput(text)).toBe(expected);
  });

  it('formata no padrão brasileiro', () => {
    expect(formatCurrencyInput(1500.75)).toBe(brl('R$ 1.500,75'));
    expect(formatCurrencyInput(0.07)).toBe(brl('R$ 0,07'));
    expect(formatCurrencyInput(undefined)).toBe('');
  });

  it('apagar o último dígito volta os centavos para a direita', () => {
    expect(parseCurrencyInput('R$ 10,0')).toBe(1);
  });

  it('limita ao máximo que o banco guarda', () => {
    expect(parseCurrencyInput('99999999999999999')).toBe(999_999_999_999.99);
  });
});
