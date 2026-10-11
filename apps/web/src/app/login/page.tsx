import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      {/* O destino depois do login vem da URL (?next=), lida no cliente. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
