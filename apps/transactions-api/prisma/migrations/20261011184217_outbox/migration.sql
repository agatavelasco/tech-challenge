-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "message_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- Índice parcial: o relay só procura eventos não publicados; os já publicados
-- (a imensa maioria) não ocupam espaço nele.
CREATE INDEX "outbox_events_unpublished_idx" ON "outbox_events" ("created_at") WHERE "published_at" IS NULL;
