import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export async function chooseOption(fieldName: string, optionName: string): Promise<void> {
  await userEvent.click(screen.getByRole('combobox', { name: fieldName }));
  const listbox = await screen.findByRole('listbox');
  await userEvent.click(within(listbox).getByRole('option', { name: optionName }));
}
