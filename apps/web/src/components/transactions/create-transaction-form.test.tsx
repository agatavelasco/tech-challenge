import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { buildTransaction } from '@/test/fixtures';
import { navigation } from '@/test/navigation';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { CreateTransactionForm } from './create-transaction-form';

// Identificadores são colados, não digitados: é o uso real e mantém o teste rápido.
async function pasteInto(name: string, text: string) {
  await userEvent.click(screen.getByRole('textbox', { name }));
  await userEvent.paste(text);
}

async function fillValidForm() {
  await pasteInto('Conta de débito', '3fa85f64-5717-4562-b3fc-2c963f66afa6');
  await pasteInto('Conta de crédito', '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f');
  await userEvent.selectOptions(
    await screen.findByRole('combobox', { name: 'Tipo de transferência' }),
    await screen.findByRole('option', { name: 'TED' }),
  );
  await userEvent.type(screen.getByRole('spinbutton', { name: 'Valor (R$)' }), '250.50');
}

describe('CreateTransactionForm', () => {
  it('mostra os erros de validação sem chamar a API', async () => {
    const onPost = vi.fn();
    server.use(http.post('*/api/transactions', onPost));

    renderWithProviders(<CreateTransactionForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Criar transação' }));

    expect(await screen.findByText('Conta de débito inválida')).toBeInTheDocument();
    expect(screen.getByText('Conta de crédito inválida')).toBeInTheDocument();
    expect(screen.getByText('Selecione o tipo de transferência')).toBeInTheDocument();
    expect(screen.getByText('Informe um valor numérico')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Conta de débito' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(onPost).not.toHaveBeenCalled();
  });

  it('recusa contas iguais', async () => {
    renderWithProviders(<CreateTransactionForm />);
    await fillValidForm();
    await userEvent.clear(screen.getByRole('textbox', { name: 'Conta de crédito' }));
    await pasteInto('Conta de crédito', '3fa85f64-5717-4562-b3fc-2c963f66afa6');
    await userEvent.click(screen.getByRole('button', { name: 'Criar transação' }));

    expect(
      await screen.findByText('As contas de débito e crédito devem ser diferentes'),
    ).toBeInTheDocument();
  });

  it('cria a transação e abre o detalhe', async () => {
    let body: unknown;
    server.use(
      http.post('*/api/transactions', async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(buildTransaction({ transactionStatus: { name: 'pending' } }), {
          status: 201,
        });
      }),
    );

    renderWithProviders(<CreateTransactionForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Criar transação' }));

    await vi.waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith(
        '/transactions/01a12c49-2a9b-7529-b23c-05f14ddd4710',
      );
    });
    expect(body).toEqual({
      accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      accountExternalIdCredit: '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f',
      transferTypeId: 2,
      value: 250.5,
    });
  });

  it('mostra no campo o erro devolvido pela API', async () => {
    server.use(
      http.post('*/api/transactions', () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Dados inválidos',
            errors: { transferTypeId: ['Tipo de transferência inexistente'] },
          },
          { status: 400 },
        ),
      ),
    );

    renderWithProviders(<CreateTransactionForm />);
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Criar transação' }));

    expect(await screen.findByText('Tipo de transferência inexistente')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Dados inválidos');
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('gera um identificador de conta válido', async () => {
    renderWithProviders(<CreateTransactionForm />);

    const [generateDebit] = screen.getAllByRole('button', { name: 'Gerar' });
    if (generateDebit) await userEvent.click(generateDebit);

    const debit = screen.getByRole<HTMLInputElement>('textbox', { name: 'Conta de débito' });
    expect(debit.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
