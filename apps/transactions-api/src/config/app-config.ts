import { kafkaConfigSchema } from '@tech-challenge/messaging';
import { z } from 'zod';

export const APP_CONFIG = Symbol('APP_CONFIG');

const appConfigSchema = z.object({
  DATABASE_URL: z.string().min(1),
  TRANSACTIONS_PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  KAFKA_GROUP_ID_TRANSACTIONS: z.string().min(1).default('transactions-consumer'),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(500),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().max(1000).default(100),
  OUTBOX_RETENTION_HOURS: z.coerce.number().int().positive().default(72),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
  DEMO_USER_EMAIL: z.email().optional(),
  DEMO_USER_PASSWORD: z.string().min(8).optional(),
  ...kafkaConfigSchema.shape,
});
export type AppConfig = z.infer<typeof appConfigSchema>;

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = appConfigSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Configuração inválida:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
