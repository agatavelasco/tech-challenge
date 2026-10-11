'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createTransactionSchema, type CreateTransactionInput } from '@tech-challenge/contracts';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api-client';
import { useCreateTransaction, useTransferTypes } from '@/lib/transaction-queries';
import { Button } from '../ui/button';
import { Field, inputClassName } from '../ui/field';

const FIELDS = [
  'accountExternalIdDebit',
  'accountExternalIdCredit',
  'transferTypeId',
  'value',
] as const satisfies readonly (keyof CreateTransactionInput)[];

const isFormField = (field: string): field is (typeof FIELDS)[number] =>
  (FIELDS as readonly string[]).includes(field);

export function CreateTransactionForm() {
  const router = useRouter();
  const transferTypes = useTransferTypes();
  const createTransaction = useCreateTransaction();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({ resolver: zodResolver(createTransactionSchema) });

  const onSubmit = handleSubmit(async (input) => {
    try {
      const created = await createTransaction.mutateAsync(input);
      router.push(`/transactions/${created.transactionExternalId}`);
    } catch (error) {
      // A API valida com o mesmo schema, mas pode recusar o que só ela sabe
      // (ex.: tipo inexistente): o erro volta para o campo certo.
      const fieldErrors = error instanceof ApiError ? Object.entries(error.fieldErrors) : [];
      for (const [field, messages] of fieldErrors) {
        if (isFormField(field) && messages?.[0]) setError(field, { message: messages[0] });
      }
      setError('root', {
        message: error instanceof Error ? error.message : 'Não foi possível criar a transação.',
      });
    }
  });

  const generateAccount = (field: 'accountExternalIdDebit' | 'accountExternalIdCredit') => {
    setValue(field, crypto.randomUUID(), { shouldValidate: true });
  };

  const describedBy = (id: string, hasError: boolean) => (hasError ? `${id}-error` : undefined);

  return (
    <form
      noValidate
      aria-labelledby="create-transaction-title"
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 id="create-transaction-title" className="text-xl font-semibold">
        Nova transação
      </h1>

      {errors.root?.message && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errors.root.message}
        </p>
      )}

      {(['accountExternalIdDebit', 'accountExternalIdCredit'] as const).map((field) => (
        <Field
          key={field}
          id={field}
          label={field === 'accountExternalIdDebit' ? 'Conta de débito' : 'Conta de crédito'}
          error={errors[field]?.message}
          hint="Identificador (GUID) da conta."
        >
          <div className="flex gap-2">
            <input
              id={field}
              className={`${inputClassName} flex-1 font-mono`}
              placeholder="00000000-0000-0000-0000-000000000000"
              aria-invalid={Boolean(errors[field])}
              aria-describedby={describedBy(field, Boolean(errors[field]))}
              {...register(field)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                generateAccount(field);
              }}
            >
              Gerar
            </Button>
          </div>
        </Field>
      ))}

      <Field
        id="transferTypeId"
        label="Tipo de transferência"
        error={errors.transferTypeId?.message}
      >
        <select
          id="transferTypeId"
          className={inputClassName}
          defaultValue=""
          disabled={!transferTypes.data}
          aria-invalid={Boolean(errors.transferTypeId)}
          aria-describedby={describedBy('transferTypeId', Boolean(errors.transferTypeId))}
          {...register('transferTypeId', { valueAsNumber: true })}
        >
          <option value="" disabled>
            {transferTypes.isError ? 'Não foi possível carregar os tipos' : 'Selecione'}
          </option>
          {transferTypes.data?.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="value"
        label="Valor (R$)"
        error={errors.value?.message}
        hint="Acima de R$ 1.000,00 a transação é rejeitada pelo antifraude."
      >
        <input
          id="value"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          className={inputClassName}
          aria-invalid={Boolean(errors.value)}
          aria-describedby={describedBy('value', Boolean(errors.value)) ?? 'value-hint'}
          {...register('value', { valueAsNumber: true })}
        />
      </Field>

      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            router.push('/transactions');
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Criando…' : 'Criar transação'}
        </Button>
      </div>
    </form>
  );
}
