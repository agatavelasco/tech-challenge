import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DatePicker } from './date-picker';

function Harness({ initial, min }: { initial?: string; min?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="de">De</label>
      <DatePicker id="de" value={value} min={min} onChange={setValue} />
      <output>{value ?? 'vazio'}</output>
    </>
  );
}

describe('DatePicker', () => {
  it('abre o calendário no mês da data escolhida e seleciona um dia', async () => {
    render(<Harness initial="2026-10-12" />);
    const trigger = screen.getByRole('button', { name: 'De' });
    expect(trigger).toHaveTextContent('12/10/2026');

    await userEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Escolher data' })).toHaveTextContent(
      'Outubro de 2026',
    );
    await userEvent.click(screen.getByRole('button', { name: '20 de outubro de 2026' }));

    expect(screen.getByRole('status')).toHaveTextContent('2026-10-20');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navega entre os meses', async () => {
    render(<Harness initial="2026-10-12" />);

    await userEvent.click(screen.getByRole('button', { name: 'De' }));
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));

    expect(screen.getByRole('dialog')).toHaveTextContent('Novembro de 2026');
  });

  it('desabilita os dias fora do limite', async () => {
    render(<Harness initial="2026-10-12" min="2026-10-10" />);

    await userEvent.click(screen.getByRole('button', { name: 'De' }));

    expect(screen.getByRole('button', { name: '9 de outubro de 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '10 de outubro de 2026' })).toBeEnabled();
  });

  it('limpa a data escolhida', async () => {
    render(<Harness initial="2026-10-12" />);

    await userEvent.click(screen.getByRole('button', { name: 'De' }));
    await userEvent.click(screen.getByRole('button', { name: 'Limpar data' }));

    expect(screen.getByRole('status')).toHaveTextContent('vazio');
    expect(screen.getByRole('button', { name: 'De' })).toHaveTextContent('dd/mm/aaaa');
  });
});
