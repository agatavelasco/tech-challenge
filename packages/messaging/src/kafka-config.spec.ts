import { kafkaConfigSchema } from './kafka-config.js';

describe('kafkaConfigSchema', () => {
  it('separa a lista de brokers e aplica os padrões', () => {
    expect(kafkaConfigSchema.parse({ KAFKA_BROKERS: 'kafka-1:9092, kafka-2:9092' })).toEqual({
      KAFKA_BROKERS: ['kafka-1:9092', 'kafka-2:9092'],
      KAFKA_CLIENT_ID: 'tech-challenge',
      KAFKA_TOPIC_PARTITIONS: 3,
    });
  });

  it('exige ao menos um broker', () => {
    expect(kafkaConfigSchema.safeParse({}).success).toBe(false);
  });
});
