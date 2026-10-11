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

interface PendingOutboxEvent {
  id: string;
  topic: string;
  message_key: string;
  payload: unknown;
}

/**
 * Publica no Kafka os eventos gravados no outbox. A cada ciclo trava um lote de
 * eventos não publicados com FOR UPDATE SKIP LOCKED — várias instâncias da API podem
 * rodar o relay sem publicar o mesmo lote — envia e só então marca como publicado.
 * Se o Kafka falhar, a transação é desfeita e o lote volta a ficar disponível.
 *
 * Garantia: pelo menos uma vez. Uma queda entre o envio e o commit republica o lote,
 * por isso os consumidores são idempotentes.
 */
@Injectable()
export class OutboxRelay implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxRelay.name);
  private timer: NodeJS.Timeout | undefined;
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
  }

  async onApplicationShutdown(): Promise<void> {
    clearInterval(this.timer);
    await this.inFlight;
  }

  /** Publica um lote. Devolve quantos eventos foram publicados. */
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
    // Um ciclo por vez: se o anterior ainda está enviando, este é pulado.
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
