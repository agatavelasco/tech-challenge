import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { PENDING_REFETCH_INTERVAL_MS } from '@/lib/transaction-queries';
import { buildPage, buildTransaction } from '@/test/fixtures';
import { navigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { TransactionsDashboard } from './transactions-dashboard';

describe('TransactionsDashboard', () => {
  it('mostra o carregamento e depois as transações', async () => {
    server.use(
      http.get('*/api/transactions', () =>
        HttpResponse.json(
          buildPage([buildTransaction({ value: 1500, transactionStatus: { name: 'rejected' } })]),
        ),
      ),
    );

    renderWithProviders(<TransactionsDashboard />);

    expect(screen.getByRole('status', { name: 'Carregando transações' })).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Transações' });
    const [, row] = within(table).getAllByRole('row');
    expect(row).toHaveTextContent('Pix');
    expect(row).toHaveTextContent('R$ 1.500,00');
    expect(row).toHaveTextContent('Rejeitada');
  });

  it('mostra o estado vazio com atalho para criar quando não há transações', async () => {
    renderWithProviders(<TransactionsDashboard />);

    expect(await screen.findByText('Nenhuma transação ainda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar transação' })).toHaveAttribute(
      'href',
      '/transactions/new',
    );
  });

  it('mostra o erro e permite tentar de novo', async () => {
    let attempts = 0;
    server.use(
      http.get('*/api/transactions', () => {
        attempts++;
        return attempts === 1
          ? HttpResponse.json({ statusCode: 502, message: 'API fora do ar' }, { status: 502 })
          : HttpResponse.json(buildPage([buildTransaction()]));
      }),
    );

    renderWithProviders(<TransactionsDashboard />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('API fora do ar');
    await userEvent.click(within(alert).getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('table', { name: 'Transações' })).toBeInTheDocument();
  });

  it('aplica os filtros na URL e na consulta à API', async () => {
    const requestedUrls: URL[] = [];
    server.use(
      http.get('*/api/transactions', ({ request }) => {
        requestedUrls.push(new URL(request.url));
        return HttpResponse.json(buildPage([]));
      }),
    );
    navigation.setUrl('/transactions?status=pending&transferTypeId=2&page=3');

    renderWithProviders(<TransactionsDashboard />);

    await screen.findByText('Nenhuma transação encontrada');
    expect(requestedUrls[0]?.searchParams.get('status')).toBe('pending');
    expect(requestedUrls[0]?.searchParams.get('transferTypeId')).toBe('2');
    expect(requestedUrls[0]?.searchParams.get('page')).toBe('3');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'rejected');

    // Trocar filtro volta para a primeira página.
    expect(navigation.replace).toHaveBeenLastCalledWith(
      '/transactions?status=rejected&transferTypeId=2',
      { scroll: false },
    );
  });

  it('limpa os filtros a partir do estado vazio', async () => {
    navigation.setUrl('/transactions?status=approved');

    renderWithProviders(<TransactionsDashboard />);

    const empty = await screen.findByText('Nenhuma transação encontrada');
    await userEvent.click(
      within(empty.parentElement as HTMLElement).getByRole('button', { name: 'Limpar filtros' }),
    );
    expect(navigation.replace).toHaveBeenLastCalledWith('/transactions', { scroll: false });
  });

  it('navega entre páginas', async () => {
    server.use(
      http.get('*/api/transactions', () =>
        HttpResponse.json(buildPage([buildTransaction()], { total: 25, totalPages: 3 })),
      ),
    );

    renderWithProviders(<TransactionsDashboard />);

    const pagination = await screen.findByRole('navigation', { name: 'Paginação' });
    expect(pagination).toHaveTextContent('Mostrando 1–10 de 25');
    await userEvent.click(within(pagination).getByRole('button', { name: 'Página 2' }));
    expect(navigation.replace).toHaveBeenLastCalledWith('/transactions?page=2', { scroll: false });
  });

  it('atualiza sozinho o status enquanto há transação pendente', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let status: 'pending' | 'approved' = 'pending';
    server.use(
      http.get('*/api/transactions', () =>
        HttpResponse.json(buildPage([buildTransaction({ transactionStatus: { name: status } })])),
      ),
    );

    try {
      renderWithProviders(<TransactionsDashboard />);
      const table = await screen.findByRole('table', { name: 'Transações' });
      expect(within(table).getByText('Pendente')).toBeInTheDocument();

      status = 'approved';
      await vi.advanceTimersByTimeAsync(PENDING_REFETCH_INTERVAL_MS);

      await waitFor(() => {
        expect(within(table).getByText('Aprovada')).toBeInTheDocument();
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
