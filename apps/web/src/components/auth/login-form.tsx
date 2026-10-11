'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@tech-challenge/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ApiError, apiClient } from '@/lib/api-client';
import { Button } from '../ui/button';
import { Field, inputClassName } from '../ui/field';

/** Só caminhos internos: `next=https://site-malicioso` não pode virar redirecionamento. */
function safeNextPath(next: string | null): string {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/transactions';
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await apiClient.login(input);
      router.replace(safeNextPath(searchParams.get('next')));
    } catch (error) {
      setError('root', {
        message:
          error instanceof ApiError && error.status === 401
            ? 'E-mail ou senha inválidos.'
            : error instanceof Error
              ? error.message
              : 'Não foi possível entrar.',
      });
    }
  });

  return (
    <form
      noValidate
      aria-labelledby="login-title"
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 id="login-title" className="text-xl font-semibold">
        Entrar
      </h1>

      {errors.root?.message && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errors.root.message}
        </p>
      )}

      <Field id="email" label="E-mail" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="username"
          className={inputClassName}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
      </Field>

      <Field id="password" label="Senha" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClassName}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
        />
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
