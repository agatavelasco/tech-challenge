import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const appConfigSchema = z.object({
  DATABASE_URL: z.string().min(1),
  TRANSACTIONS_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:3000'),
});
export type AppConfig = z.infer<typeof appConfigSchema>;

/** Falha na subida, com a lista do que falta, em vez de quebrar no primeiro uso. */
export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = appConfigSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
