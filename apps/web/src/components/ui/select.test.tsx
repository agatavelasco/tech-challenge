import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Landmark, QrCode, Shapes } from 'lucide-react';
import { useState } from 'react';
import { Select } from './select';

function Harness({ onChange = () => undefined }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <>
      <label htmlFor="tipo">Tipo</label>
      <Select
        id="tipo"
        value={value}
        icon={<Shapes />}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        options={[
          { value: '1', label: 'Pix', icon: <QrCode /> },
          { value: '2', label: 'TED', icon: <Landmark /> },
          { value: '3', label: 'Boleto', disabled: true },
        ]}
      />
      <button type="button">fora</button>
    </>
  );
}

describe('Select', () => {
  it('abre a lista ao clicar e escolhe a opção', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const combobox = screen.getByRole('combobox', { name: 'Tipo' });

    expect(combobox).toHaveTextContent('Selecione');
    await userEvent.click(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('option', { name: 'TED' }));

    expect(onChange).toHaveBeenCalledWith('2');
    expect(combobox).toHaveTextContent('TED');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('o ícone do campo acompanha a opção escolhida', async () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Tipo' });

    expect(combobox.querySelector('.lucide-shapes')).not.toBeNull();
    await userEvent.click(combobox);
    await userEvent.click(screen.getByRole('option', { name: 'Pix' }));

    expect(combobox.querySelector('.lucide-qr-code')).not.toBeNull();
    expect(combobox.querySelector('.lucide-shapes')).toBeNull();
  });

  it('funciona pelo teclado e pula opções desabilitadas', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const combobox = screen.getByRole('combobox', { name: 'Tipo' });
    combobox.focus();

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('fecha com Esc e com clique fora', async () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Tipo' });

    await userEvent.click(combobox);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await userEvent.click(combobox);
    await userEvent.click(screen.getByRole('button', { name: 'fora' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
