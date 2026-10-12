'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createTransactionSchema, type CreateTransactionInput } from '@tech-challenge/contracts';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  CircleAlert,
  Dices,
  LoaderCircle,
  ReceiptText,
  Send,
  Shapes,
  ShieldCheck,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api-client';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/currency-mask';
import { useCreateTransaction, useTransferTypes } from '@/lib/transaction-queries';
import { Button } from '../ui/button';
import { Field, inputClassName } from '../ui/field';
import { Select } from '../ui/select';
import { TransferTypeIcon } from './transfer-type-icon';

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
    control,
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
      className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs motion-safe:animate-fade-up sm:p-8"
    >
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 ring-inset"
        >
          <ReceiptText className="size-5" />
        </span>
        <h1 id="create-transaction-title" className="text-xl font-semibold tracking-tight">
          Nova transação
        </h1>
      </header>

      {errors.root?.message && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {errors.root.message}
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
        {(['accountExternalIdDebit', 'accountExternalIdCredit'] as const).map((field, index) => (
          <div key={field} className="flex flex-col gap-2">
            {index === 1 && (
              <span aria-hidden className="flex justify-center text-slate-300">
                <ArrowDown className="size-4" />
              </span>
            )}
            <Field
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
                  <Dices aria-hidden />
                  Gerar
                </Button>
              </div>
            </Field>
          </div>
        ))}
      </div>

      <Field
        id="transferTypeId"
        label="Tipo de transferência"
        error={errors.transferTypeId?.message}
      >
        <Controller
          name="transferTypeId"
          control={control}
          render={({ field }) => (
            <Select
              id="transferTypeId"
              ref={field.ref}
              // Antes da escolha o valor é undefined em runtime, apesar do tipo number.
              value={Number.isFinite(field.value) ? String(field.value) : ''}
              onChange={(value) => {
                field.onChange(Number(value));
              }}
              onBlur={field.onBlur}
              icon={<Shapes />}
              placeholder={
                transferTypes.isError ? 'Não foi possível carregar os tipos' : 'Selecione'
              }
              disabled={!transferTypes.data}
              invalid={Boolean(errors.transferTypeId)}
              aria-describedby={describedBy('transferTypeId', Boolean(errors.transferTypeId))}
              options={(transferTypes.data ?? []).map((type) => ({
                value: String(type.id),
                label: type.name,
                icon: <TransferTypeIcon name={type.name} />,
              }))}
            />
          )}
        />
      </Field>

      <Field
        id="value"
        label="Valor"
        error={errors.value?.message}
        hint={
          <>
            <ShieldCheck aria-hidden className="size-3.5 text-slate-400" />
            Acima de R$ 1.000,00 a transação é rejeitada pelo antifraude.
          </>
        }
      >
        <Controller
          name="value"
          control={control}
          render={({ field }) => (
            <input
              id="value"
              ref={field.ref}
              name={field.name}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="R$ 0,00"
              className={`${inputClassName} h-14 text-2xl font-semibold tracking-tight tabular-nums placeholder:font-normal`}
              value={formatCurrencyInput(field.value)}
              onChange={(event) => {
                field.onChange(parseCurrencyInput(event.target.value));
              }}
              onBlur={field.onBlur}
              aria-invalid={Boolean(errors.value)}
              aria-describedby={describedBy('value', Boolean(errors.value)) ?? 'value-hint'}
            />
          )}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
        <Button
          variant="ghost"
          size="lg"
          className="sm:min-w-44"
          onClick={() => {
            router.push('/transactions');
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" size="lg" className="sm:min-w-44" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
          ) : (
            <Send aria-hidden />
          )}
          {isSubmitting ? 'Criando…' : 'Criar transação'}
        </Button>
      </div>
    </form>
  );
}
