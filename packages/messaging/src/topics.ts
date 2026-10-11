import type { Kafka } from 'kafkajs';

/**
 * Cria os tópicos de forma idempotente na subida do serviço. Não depender da
 * criação automática do broker garante o número de partições e evita que um
 * consumidor se inscreva num tópico que ainda não existe.
 */
export async function ensureTopics(
  kafka: Kafka,
  topics: string[],
  partitions: number,
): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();
  try {
    const existing = new Set(await admin.listTopics());
    const missing = topics.filter((topic) => !existing.has(topic));
    if (missing.length === 0) return;

    await admin.createTopics({
      waitForLeaders: true,
      topics: missing.map((topic) => ({ topic, numPartitions: partitions })),
    });
  } finally {
    await admin.disconnect();
  }
}
