import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { RECONNECT_INTERVAL_MS } from '@/lib/service-status';
import { PENDING_REFETCH_INTERVAL_MS } from '@/lib/transaction-queries';
import { buildPage, buildTransaction } from '@/test/fixtures';
import { navigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { chooseOption } from '@/test/select';
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

  it('mostra erro que não se resolve sozinho com opção de tentar de novo', async () => {
    let attempts = 0;
    server.use(
      http.get('*/api/transactions', () => {
        attempts++;
        return attempts === 1
          ? HttpResponse.json({ statusCode: 403, message: 'Acesso negado' }, { status: 403 })
          : HttpResponse.json(buildPage([buildTransaction()]));
      }),
    );

    renderWithProviders(<TransactionsDashboard />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Acesso negado');
    await userEvent.click(within(alert).getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('table', { name: 'Transações' })).toBeInTheDocument();
  });

  it('com a API fora, avisa que o serviço vai voltar e reconecta sozinho', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let apiIsUp = false;
    server.use(
      http.get('*/api/transactions', () =>
        apiIsUp
          ? HttpResponse.json(buildPage([buildTransaction()]))
          : HttpResponse.json({ statusCode: 502, message: 'indisponível' }, { status: 502 }),
      ),
    );

    try {
      renderWithProviders(<TransactionsDashboard />);
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'O serviço está temporariamente indisponível',
      );

      apiIsUp = true;
      await vi.advanceTimersByTimeAsync(RECONNECT_INTERVAL_MS);

      expect(await screen.findByRole('table', { name: 'Transações' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('avisa quando a análise de alguma transação na tela está demorando', async () => {
    server.use(
      http.get('*/api/transactions', () =>
        HttpResponse.json(
          buildPage([
            buildTransaction({
              transactionStatus: { name: 'pending' },
              createdAt: new Date(Date.now() - 60_000).toISOString(),
            }),
          ]),
        ),
      ),
    );

    renderWithProviders(<TransactionsDashboard />);

    expect(
      await screen.findByText('A análise antifraude está demorando mais que o normal.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/As transações estão registradas/)).toBeInTheDocument();
  });

  it('não mostra o aviso de demora para pendente recém-criada', async () => {
    server.use(
      http.get('*/api/transactions', () =>
        HttpResponse.json(
          buildPage([
            buildTransaction({
              transactionStatus: { name: 'pending' },
              createdAt: new Date().toISOString(),
            }),
          ]),
        ),
      ),
    );

    renderWithProviders(<TransactionsDashboard />);

    await screen.findByRole('table', { name: 'Transações' });
    expect(screen.queryByText(/demorando mais que o normal/)).not.toBeInTheDocument();
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

    await chooseOption('Status', 'Rejeitada');

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

  it('troca a quantidade de itens por página e volta para a primeira página', async () => {
    const requestedPageSizes: (string | null)[] = [];
    server.use(
      http.get('*/api/transactions', ({ request }) => {
        requestedPageSizes.push(new URL(request.url).searchParams.get('pageSize'));
        return HttpResponse.json(buildPage([buildTransaction()], { total: 25, totalPages: 3 }));
      }),
    );
    navigation.setUrl('/transactions?page=2&status=approved');

    renderWithProviders(<TransactionsDashboard />);

    await userEvent.click(await screen.findByRole('combobox', { name: 'Itens por página' }));
    expect(
      within(screen.getByRole('listbox'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['10', '20', '30']);
    expect(requestedPageSizes[0]).toBe('10');

    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '20' }));

    expect(navigation.replace).toHaveBeenLastCalledWith(
      '/transactions?pageSize=20&status=approved',
      { scroll: false },
    );
  });

  it('consulta a API com o tamanho de página da URL', async () => {
    const requestedPageSizes: (string | null)[] = [];
    server.use(
      http.get('*/api/transactions', ({ request }) => {
        requestedPageSizes.push(new URL(request.url).searchParams.get('pageSize'));
        return HttpResponse.json(
          buildPage([buildTransaction()], { pageSize: 30, total: 25, totalPages: 1 }),
        );
      }),
    );
    navigation.setUrl('/transactions?pageSize=30');

    renderWithProviders(<TransactionsDashboard />);

    const pagination = await screen.findByRole('navigation', { name: 'Paginação' });
    expect(requestedPageSizes[0]).toBe('30');
    expect(pagination).toHaveTextContent('Mostrando 1–25 de 25');
    expect(
      within(pagination).getByRole('combobox', { name: 'Itens por página' }),
    ).toHaveTextContent('30');
    expect(within(pagination).queryByRole('button', { name: 'Próxima' })).not.toBeInTheDocument();
  });

  it('só mostra "Limpar filtros" quando há filtro ativo', async () => {
    renderWithProviders(<TransactionsDashboard />);
    const filters = await screen.findByRole('search', { name: 'Filtros' });

    expect(
      within(filters).queryByRole('button', { name: 'Limpar filtros' }),
    ).not.toBeInTheDocument();
  });

  it('abre o detalhe ao clicar em qualquer parte da linha', async () => {
    server.use(
      http.get('*/api/transactions', () => HttpResponse.json(buildPage([buildTransaction()]))),
    );

    renderWithProviders(<TransactionsDashboard />);
    const table = await screen.findByRole('table', { name: 'Transações' });
    await userEvent.click(within(table).getByText('R$ 120,00'));

    expect(navigation.push).toHaveBeenCalledWith(
      '/transactions/01a12c49-2a9b-7529-b23c-05f14ddd4710',
    );
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
