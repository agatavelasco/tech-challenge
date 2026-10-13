import { z } from 'zod';

export const kafkaConfigSchema = z.object({
  KAFKA_BROKERS: z
    .string()
    .min(1)
    .transform((value) => value.split(',').map((broker) => broker.trim())),
  KAFKA_CLIENT_ID: z.string().min(1).default('tech-challenge'),
  KAFKA_TOPIC_PARTITIONS: z.coerce.number().int().positive().default(3),
});
export type KafkaConfig = z.infer<typeof kafkaConfigSchema>;
