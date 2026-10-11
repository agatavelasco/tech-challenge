import { expect, test, type Page } from '@playwright/test';

// Mesmo usuário de demonstração que o docker-compose cria na API.
const DEMO_USER = {
  email: process.env.DEMO_USER_EMAIL ?? 'demo@desafio.local',
  password: process.env.DEMO_USER_PASSWORD ?? 'demo12345',
};

async function login(page: Page) {
  await page.goto('/transactions');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByRole('textbox', { name: 'E-mail' }).fill(DEMO_USER.email);
  await page.getByLabel('Senha').fill(DEMO_USER.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/transactions$/);
}

async function createTransaction(page: Page, { value, type }: { value: string; type: string }) {
  await page.goto('/transactions/new');
  const generateButtons = page.getByRole('button', { name: 'Gerar' });
  await generateButtons.nth(0).click();
  await generateButtons.nth(1).click();
  await page.getByRole('combobox', { name: 'Tipo de transferência' }).selectOption({ label: type });
  await page.getByRole('spinbutton', { name: 'Valor (R$)' }).fill(value);
  await page.getByRole('button', { name: 'Criar transação' }).click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  // O Next mantém a página anterior oculta no DOM (para o voltar ser instantâneo):
  // as verificações ficam restritas ao detalhe visível.
  return page.getByRole('article');
}

test('sem sessão, o dashboard leva ao login e volta para a página pedida', async ({ page }) => {
  await page.goto('/transactions?status=approved');
  await expect(page).toHaveURL(/\/login\?next=%2Ftransactions%3Fstatus%3Dapproved$/);

  await page.getByRole('textbox', { name: 'E-mail' }).fill(DEMO_USER.email);
  await page.getByLabel('Senha').fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();
  // O Next também tem um role="alert" (anunciador de rotas): filtra pelo texto.
  await expect(
    page.getByRole('alert').filter({ hasText: 'E-mail ou senha inválidos.' }),
  ).toBeVisible();

  await page.getByLabel('Senha').fill(DEMO_USER.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/transactions\?status=approved$/);
});

test.describe('Fluxo de transação de ponta a ponta', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('transação até 1000 é aprovada sem recarregar a página', async ({ page }) => {
    const detail = await createTransaction(page, { value: '1000', type: 'Pix' });

    await expect(detail.getByText('R$ 1.000,00')).toBeVisible();
    // O antifraude responde de forma assíncrona; o detalhe atualiza sozinho.
    await expect(detail.getByText('Aprovada')).toBeVisible();
    await expect(detail.getByText('Análise antifraude concluída.')).toBeVisible();
  });

  test('transação acima de 1000 é rejeitada e aparece no filtro de rejeitadas', async ({
    page,
  }) => {
    const detail = await createTransaction(page, { value: '1000.01', type: 'TED' });
    await expect(detail.getByText('Rejeitada')).toBeVisible();

    await page.goto('/transactions?status=rejected');
    const table = page.getByRole('table', { name: 'Transações' });
    await expect(table.getByRole('row').filter({ hasText: 'R$ 1.000,01' }).first()).toContainText(
      'Rejeitada',
    );
  });

  test('o formulário barra dados inválidos antes de chamar a API', async ({ page }) => {
    await page.goto('/transactions/new');
    await page.getByRole('button', { name: 'Criar transação' }).click();

    await expect(page.getByText('Conta de débito inválida')).toBeVisible();
    await expect(page.getByText('Informe um valor numérico')).toBeVisible();
    await expect(page).toHaveURL(/\/transactions\/new$/);
  });
});
