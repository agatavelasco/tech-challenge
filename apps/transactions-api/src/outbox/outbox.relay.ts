import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { KafkaPublisher } from '@tech-challenge/messaging';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { PrismaService } from '../prisma/prisma.service.js';

const PURGE_INTERVAL_MS = 60 * 60 * 1000;

interface PendingOutboxEvent {
  id: string;
  topic: string;
  message_key: string;
  payload: unknown;
}

@Injectable()
export class OutboxRelay implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxRelay.name);
  private timer: NodeJS.Timeout | undefined;
  private purgeTimer: NodeJS.Timeout | undefined;
  private inFlight: Promise<void> | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: KafkaPublisher,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      this.tick();
    }, this.config.OUTBOX_POLL_INTERVAL_MS);
    this.purgeTimer = setInterval(() => {
      this.purgePublished().catch((error: unknown) => {
        this.logger.warn(`Falha ao limpar o outbox: ${String(error)}`);
      });
    }, PURGE_INTERVAL_MS);
  }

  async onApplicationShutdown(): Promise<void> {
    clearInterval(this.timer);
    clearInterval(this.purgeTimer);
    await this.inFlight;
  }

  async purgePublished(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.config.OUTBOX_RETENTION_HOURS * 3_600_000);
    const { count } = await this.prisma.outboxEvent.deleteMany({
      where: { publishedAt: { lt: cutoff } },
    });
    return count;
  }

  async publishPending(): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        const events = await tx.$queryRaw<PendingOutboxEvent[]>`
          SELECT id, topic, message_key, payload
          FROM outbox_events
          WHERE published_at IS NULL
          ORDER BY created_at, id
          LIMIT ${this.config.OUTBOX_BATCH_SIZE}
          FOR UPDATE SKIP LOCKED`;
        if (events.length === 0) return 0;

        await this.publisher.publish(
          events.map((event) => ({
            topic: event.topic,
            key: event.message_key,
            value: event.payload,
          })),
        );
        await tx.outboxEvent.updateMany({
          where: { id: { in: events.map((event) => event.id) } },
          data: { publishedAt: new Date() },
        });
        return events.length;
      },
      { maxWait: 5_000, timeout: 30_000 },
    );
  }

  private tick(): void {
    if (this.inFlight) return;
    this.inFlight = this.publishPending()
      .then(() => undefined)
      .catch((error: unknown) => {
        this.logger.warn(
          `Falha ao publicar o outbox; nova tentativa no próximo ciclo: ${String(error)}`,
        );
      })
      .finally(() => {
        this.inFlight = undefined;
      });
  }
}
