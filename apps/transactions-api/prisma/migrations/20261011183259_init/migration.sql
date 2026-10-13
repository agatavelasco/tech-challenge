-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "transfer_types" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "transfer_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "account_external_id_debit" UUID NOT NULL,
    "account_external_id_credit" UUID NOT NULL,
    "transfer_type_id" INTEGER NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transfer_types_name_key" ON "transfer_types"("name");

-- CreateIndex
CREATE INDEX "transactions_created_at_id_idx" ON "transactions"("created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "transactions_status_created_at_idx" ON "transactions"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_transfer_type_id_created_at_idx" ON "transactions"("transfer_type_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_transfer_type_id_fkey" FOREIGN KEY ("transfer_type_id") REFERENCES "transfer_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- As regras de entrada também valem no banco: protege contra escrita que não passe pela API.
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_value_positive_check" CHECK ("value" > 0);
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_distinct_accounts_check"
  CHECK ("account_external_id_debit" <> "account_external_id_credit");

-- Dado de referência: os tipos existem em todo ambiente, sem depender de seed.
INSERT INTO "transfer_types" ("id", "name") VALUES
  (1, 'Pix'),
  (2, 'TED'),
  (3, 'Boleto');
