-- CreateEnum
CREATE TYPE "commercial_entity_type" AS ENUM ('INDIVIDUAL', 'LEGAL_ENTITY');

-- CreateTable
CREATE TABLE "clients" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "entity_type" "commercial_entity_type" NOT NULL,
  "document_type" "sensitive_document_type" NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" VARCHAR(64) NOT NULL,
  "auth_tag" VARCHAR(64) NOT NULL,
  "encryption_key_version" VARCHAR(64) NOT NULL,
  "document_digest" VARCHAR(96) NOT NULL,
  "display_name" VARCHAR(180) NOT NULL,
  "full_name" VARCHAR(180),
  "legal_name" VARCHAR(180),
  "trade_name" VARCHAR(180),
  "phone" VARCHAR(32),
  "email" VARCHAR(254),
  "address_line" VARCHAR(220),
  "city" VARCHAR(120),
  "state" VARCHAR(80),
  "postal_code" VARCHAR(24),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "inactivated_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_suppliers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "entity_type" "commercial_entity_type" NOT NULL,
  "document_type" "sensitive_document_type" NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" VARCHAR(64) NOT NULL,
  "auth_tag" VARCHAR(64) NOT NULL,
  "encryption_key_version" VARCHAR(64) NOT NULL,
  "document_digest" VARCHAR(96) NOT NULL,
  "display_name" VARCHAR(180) NOT NULL,
  "full_name" VARCHAR(180),
  "legal_name" VARCHAR(180),
  "trade_name" VARCHAR(180),
  "phone" VARCHAR(32),
  "email" VARCHAR(254),
  "address_line" VARCHAR(220),
  "city" VARCHAR(120),
  "state" VARCHAR(80),
  "postal_code" VARCHAR(24),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "inactivated_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "fuel_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_types" (
  "id" VARCHAR(32) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "fuel_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_corporation_id_company_id_is_active_idx" ON "clients"("corporation_id", "company_id", "is_active");
CREATE INDEX "clients_corporation_id_company_id_created_at_id_idx" ON "clients"("corporation_id", "company_id", "created_at", "id");
CREATE INDEX "clients_corporation_id_company_id_display_name_id_idx" ON "clients"("corporation_id", "company_id", "display_name", "id");
CREATE INDEX "clients_document_digest_idx" ON "clients"("document_digest");
CREATE UNIQUE INDEX "clients_active_document_digest_scope_unique" ON "clients"("corporation_id", "company_id", "document_digest") WHERE "is_active" = true;

-- CreateIndex
CREATE INDEX "fuel_suppliers_corporation_id_company_id_is_active_idx" ON "fuel_suppliers"("corporation_id", "company_id", "is_active");
CREATE INDEX "fuel_suppliers_corporation_id_company_id_created_at_id_idx" ON "fuel_suppliers"("corporation_id", "company_id", "created_at", "id");
CREATE INDEX "fuel_suppliers_corporation_id_company_id_display_name_id_idx" ON "fuel_suppliers"("corporation_id", "company_id", "display_name", "id");
CREATE INDEX "fuel_suppliers_document_digest_idx" ON "fuel_suppliers"("document_digest");
CREATE UNIQUE INDEX "fuel_suppliers_active_document_digest_scope_unique" ON "fuel_suppliers"("corporation_id", "company_id", "document_digest") WHERE "is_active" = true;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_corporation_id_company_id_fkey" FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_suppliers" ADD CONSTRAINT "fuel_suppliers_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fuel_suppliers" ADD CONSTRAINT "fuel_suppliers_corporation_id_company_id_fkey" FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
