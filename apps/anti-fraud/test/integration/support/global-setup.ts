import { KafkaContainer } from '@testcontainers/kafka';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    kafkaBrokers: string;
  }
}

// Mesma imagem do docker-compose: o teste roda contra o que roda em desenvolvimento.
const KAFKA_IMAGE = 'confluentinc/cp-kafka:7.7.1';

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const kafka = await new KafkaContainer(KAFKA_IMAGE).withKraft().start();
  project.provide('kafkaBrokers', `${kafka.getHost()}:${kafka.getMappedPort(9093)}`);

  return async () => {
    await kafka.stop();
  };
}
