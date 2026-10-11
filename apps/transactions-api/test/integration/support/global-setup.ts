import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KafkaContainer, type StartedKafkaContainer } from '@testcontainers/kafka';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    kafkaBrokers: string;
  }
}

const appRoot = fileURLToPath(new URL('../../..', import.meta.url));

// Mesmas imagens do docker-compose: o teste roda contra o que roda em desenvolvimento.
const POSTGRES_IMAGE = 'postgres:16-alpine';
const KAFKA_IMAGE = 'confluentinc/cp-kafka:7.7.1';

function kafkaBrokers(kafka: StartedKafkaContainer): string {
  return `${kafka.getHost()}:${kafka.getMappedPort(9093)}`;
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const [postgres, kafka] = await Promise.all([
    new PostgreSqlContainer(POSTGRES_IMAGE).start(),
    new KafkaContainer(KAFKA_IMAGE).withKraft().start(),
  ]);

  const databaseUrl = postgres.getConnectionUri();
  // As migrations reais, as mesmas do deploy: o teste também valida o SQL versionado.
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: appRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'ignore',
  });

  project.provide('databaseUrl', databaseUrl);
  project.provide('kafkaBrokers', kafkaBrokers(kafka));

  return async () => {
    await Promise.all([postgres.stop(), kafka.stop()]);
  };
}
