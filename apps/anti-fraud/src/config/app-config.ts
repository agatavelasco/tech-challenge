import { kafkaConfigSchema } from '@tech-challenge/messaging';
import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const appConfigSchema = z.object({
  ANTI_FRAUD_PORT: z.coerce.number().int().positive().default(3002),
  KAFKA_GROUP_ID_ANTI_FRAUD: z.string().min(1).default('anti-fraud-consumer'),
  ...kafkaConfigSchema.shape,
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
