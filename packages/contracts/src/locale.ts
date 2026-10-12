import { z } from 'zod';

/**
 * Mensagens padrão do zod em português, para qualquer erro sem mensagem própria no
 * schema. Fica no pacote de contratos porque o idioma das respostas faz parte do
 * contrato: API, antifraude e dashboard o herdam ao importar os schemas.
 */
z.config(z.locales.ptBR());
