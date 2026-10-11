import { createTransactionSchema } from './transaction.js';

const validInput = {
  accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  accountExternalIdCredit: '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f',
  transferTypeId: 1,
  value: 120,
};

describe('createTransactionSchema', () => {
  it('aceita uma transação válida', () => {
    expect(createTransactionSchema.safeParse(validInput).success).toBe(true);
  });

  it.each([0, -1])('rejeita valor %s', (value) => {
    expect(createTransactionSchema.safeParse({ ...validInput, value }).success).toBe(false);
  });

  it('aceita centavos e rejeita mais de duas casas decimais', () => {
    expect(createTransactionSchema.safeParse({ ...validInput, value: 0.07 }).success).toBe(true);
    expect(createTransactionSchema.safeParse({ ...validInput, value: 10.005 }).success).toBe(false);
  });

  it('rejeita débito e crédito na mesma conta', () => {
    const result = createTransactionSchema.safeParse({
      ...validInput,
      accountExternalIdCredit: validInput.accountExternalIdDebit,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['accountExternalIdCredit']);
  });

  it('rejeita identificador de conta que não é guid', () => {
    expect(
      createTransactionSchema.safeParse({ ...validInput, accountExternalIdDebit: '123' }).success,
    ).toBe(false);
  });

  it('rejeita tipo de transferência não inteiro', () => {
    expect(createTransactionSchema.safeParse({ ...validInput, transferTypeId: 1.5 }).success).toBe(
      false,
    );
  });
});
