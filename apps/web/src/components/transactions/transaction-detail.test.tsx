import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { buildTransaction } from '@/test/fixtures';
import { navigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { TransactionDetail } from './transaction-detail';

const id = '01a12c49-2a9b-7529-b23c-05f14ddd4710';

describe('TransactionDetail', () => {
  beforeEach(() => {
    navigation.params = { id };
  });

  it('mostra os dados e avisa que a análise está em andamento', async () => {
    server.use(
      http.get(`*/api/transactions/${id}`, () =>
        HttpResponse.json(
          buildTransaction({
            value: 999.9,
            transactionStatus: { name: 'pending' },
            createdAt: new Date().toISOString(),
          }),
        ),
      ),
    );

    renderWithProviders(<TransactionDetail />);

    expect(screen.getByRole('status', { name: 'Carregando transação' })).toBeInTheDocument();
    expect(await screen.findByText('R$ 999,90')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText(/Esta página atualiza sozinha/)).toBeInTheDocument();
    expect(screen.queryByText(/demorando mais que o normal/)).not.toBeInTheDocument();
  });

  it('avisa de forma amigável quando a análise demora, sem pedir nova transação', async () => {
    server.use(
      http.get(`*/api/transactions/${id}`, () =>
        HttpResponse.json(
          buildTransaction({
            transactionStatus: { name: 'pending' },
            createdAt: new Date(Date.now() - 60_000).toISOString(),
          }),
        ),
      ),
    );

    renderWithProviders(<TransactionDetail />);

    expect(
      await screen.findByText('A análise antifraude está demorando mais que o normal.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sua transação está registrada/)).toHaveTextContent(
      'não é preciso criá-la de novo',
    );
  });

  it('mostra "não encontrada" para transação inexistente', async () => {
    server.use(
      http.get(`*/api/transactions/${id}`, () =>
        HttpResponse.json(
          { statusCode: 404, message: 'Transação não encontrada' },
          { status: 404 },
        ),
      ),
    );

    renderWithProviders(<TransactionDetail />);

    expect(await screen.findByText('Transação não encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver transações' })).toHaveAttribute(
      'href',
      '/transactions',
    );
  });

  it('com o servidor fora, avisa que o serviço vai voltar e oferece tentar agora', async () => {
    server.use(http.get(`*/api/transactions/${id}`, () => HttpResponse.error()));

    renderWithProviders(<TransactionDetail />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O serviço está temporariamente indisponível',
    );
    expect(screen.getByText('Tentando reconectar…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar agora' })).toBeInTheDocument();
  });
});
