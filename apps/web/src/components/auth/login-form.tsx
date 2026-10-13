'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@tech-challenge/contracts';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircleAlert, LoaderCircle, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ApiError, apiClient } from '@/lib/api-client';
import { Button } from '../ui/button';
import { Field, InputIcon, inputClassName } from '../ui/field';

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
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1">
        <h1 id="login-title" className="text-2xl font-semibold tracking-tight">
          Entrar
        </h1>
      </div>

      {errors.root?.message && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {errors.root.message}
        </p>
      )}

      <Field id="email" label="E-mail" error={errors.email?.message}>
        <span className="relative">
          <InputIcon>
            <Mail />
          </InputIcon>
          <input
            id="email"
            type="email"
            autoComplete="username"
            className={`${inputClassName} h-11 pl-9`}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
        </span>
      </Field>

      <Field id="password" label="Senha" error={errors.password?.message}>
        <span className="relative">
          <InputIcon>
            <LockKeyhole />
          </InputIcon>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className={`${inputClassName} h-11 pl-9`}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
        </span>
      </Field>

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
        ) : (
          <LogIn aria-hidden />
        )}
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
