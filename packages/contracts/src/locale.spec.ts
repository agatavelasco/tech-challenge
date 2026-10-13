import { z } from 'zod';
import './index.js';

describe('idioma das mensagens', () => {
  it('erros sem mensagem própria saem em português', () => {
    const result = z.object({ nome: z.string() }).safeParse({});

    expect(result.error?.issues[0]?.message).toMatch(/^Entrada inválida/);
  });
});
