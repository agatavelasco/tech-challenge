const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const MAX_DIGITS = 14;

export function parseCurrencyInput(text: string): number | undefined {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, MAX_DIGITS);
  return digits ? Number(digits) / 100 : undefined;
}

export function formatCurrencyInput(value: number | undefined): string {
  return value === undefined || Number.isNaN(value) ? '' : brl.format(value);
}
