import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { navigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { LoginForm } from './login-form';

async function submit(email: string, password: string) {
  await userEvent.type(screen.getByRole('textbox', { name: 'E-mail' }), email);
  await userEvent.type(screen.getByLabelText('Senha'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

describe('LoginForm', () => {
  it('valida os campos antes de chamar a API', async () => {
    renderWithProviders(<LoginForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe um e-mail válido')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
  });

  it('avisa quando as credenciais estão erradas', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(
          { statusCode: 401, message: 'E-mail ou senha inválidos' },
          { status: 401 },
        ),
      ),
    );
    renderWithProviders(<LoginForm />);

    await submit('demo@desafio.local', 'errada');

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('entra e volta para a página que pediu o login', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.json(null)));
    navigation.setUrl('/login?next=%2Ftransactions%3Fstatus%3Dpending');
    renderWithProviders(<LoginForm />);

    await submit('demo@desafio.local', 'demo12345');

    await vi.waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('/transactions?status=pending');
    });
  });

  it('ignora destino externo no parâmetro next', async () => {
    server.use(http.post('*/api/auth/login', () => HttpResponse.json(null)));
    navigation.setUrl('/login?next=%2F%2Fsite-malicioso.com');
    renderWithProviders(<LoginForm />);

    await submit('demo@desafio.local', 'demo12345');

    await vi.waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith('/transactions');
    });
  });
});
