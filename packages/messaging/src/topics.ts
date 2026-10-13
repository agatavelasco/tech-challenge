import type { Kafka } from 'kafkajs';

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
