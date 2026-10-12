const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Até 999.999.999.999,99: o máximo que a coluna decimal(14,2) guarda. */
const MAX_DIGITS = 14;

/**
 * Máscara de moeda no padrão dos apps de banco: só dígitos contam, e eles preenchem
 * da direita para a esquerda a partir dos centavos ("150075" → 1500,75). Assim não há
 * ambiguidade entre ponto e vírgula. Sem dígitos (ou só zeros) o campo fica vazio,
 * o que permite apagar tudo com backspace.
 */
export function parseCurrencyInput(text: string): number | undefined {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
  return digits ? Number(digits) / 100 : undefined;
}

export function formatCurrencyInput(value: number | undefined): string {
  return value === undefined || Number.isNaN(value) ? '' : brl.format(value);
}
