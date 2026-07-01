CREATE TYPE "machine_type" AS ENUM ('YELLOW_LINE', 'WHITE_LINE');
CREATE TYPE "machine_identifier_kind" AS ENUM ('PLATE', 'COMPANY_TAG');
CREATE TYPE "machine_meter_reading_purpose" AS ENUM ('INITIAL', 'OWNERSHIP_TRANSFER', 'ORDINARY');
CREATE TYPE "machine_meter_reading_status" AS ENUM ('CONFIRMED');

CREATE TABLE "machines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "description" VARCHAR(500),
  "type" "machine_type" NOT NULL,
  "manufacturer" VARCHAR(120) NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "machine_ownership_periods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "effective_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_to" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "machine_ownership_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "machine_identifiers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "kind" "machine_identifier_kind" NOT NULL,
  "value" VARCHAR(80) NOT NULL,
  "normalized_value" VARCHAR(80) NOT NULL,
  "released_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "machine_identifiers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "machine_meter_readings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "value" DECIMAL(14,2) NOT NULL,
  "status" "machine_meter_reading_status" NOT NULL DEFAULT 'CONFIRMED',
  "purpose" "machine_meter_reading_purpose" NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "machine_meter_readings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "machine_meter_readings_non_negative_value" CHECK ("value" >= 0)
);

CREATE TABLE "machine_meter_reading_corrections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "reading_id" UUID NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "old_value" DECIMAL(14,2) NOT NULL,
  "new_value" DECIMAL(14,2) NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "corrected_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "machine_meter_reading_corrections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "machine_meter_reading_references" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "reading_id" UUID NOT NULL,
  "source_type" VARCHAR(80) NOT NULL,
  "source_id" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "machine_meter_reading_references_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "machines_corporation_id_id_key" ON "machines"("corporation_id", "id");
CREATE INDEX "machines_corporation_id_created_at_id_idx" ON "machines"("corporation_id", "created_at", "id");
CREATE INDEX "machines_corporation_id_name_id_idx" ON "machines"("corporation_id", "name", "id");

CREATE INDEX "machine_ownership_periods_corporation_id_company_id_machine_idx" ON "machine_ownership_periods"("corporation_id", "company_id", "machine_id");
CREATE INDEX "machine_ownership_periods_corporation_id_company_id_effecti_idx" ON "machine_ownership_periods"("corporation_id", "company_id", "effective_from", "id");
CREATE UNIQUE INDEX "machine_ownership_periods_open_period_unique" ON "machine_ownership_periods"("corporation_id", "company_id", "machine_id") WHERE "effective_to" IS NULL;

CREATE INDEX "machine_identifiers_corporation_id_company_id_machine_id_idx" ON "machine_identifiers"("corporation_id", "company_id", "machine_id");
CREATE INDEX "machine_identifiers_corporation_id_company_id_kind_normaliz_idx" ON "machine_identifiers"("corporation_id", "company_id", "kind", "normalized_value");
CREATE UNIQUE INDEX "machine_identifiers_active_scoped_unique" ON "machine_identifiers"("corporation_id", "company_id", "kind", "normalized_value") WHERE "released_at" IS NULL;

CREATE UNIQUE INDEX "machine_meter_readings_corporation_id_company_id_machine_id_key" ON "machine_meter_readings"("corporation_id", "company_id", "machine_id", "id");
CREATE INDEX "machine_meter_readings_corporation_id_company_id_machine_id_idx" ON "machine_meter_readings"("corporation_id", "company_id", "machine_id", "recorded_at", "id");
CREATE INDEX "machine_meter_reading_corrections_corporation_id_company_id_idx" ON "machine_meter_reading_corrections"("corporation_id", "company_id", "machine_id", "reading_id");
CREATE UNIQUE INDEX "machine_meter_reading_references_corporation_id_company_id__key" ON "machine_meter_reading_references"("corporation_id", "company_id", "reading_id", "source_type", "source_id");
CREATE INDEX "machine_meter_reading_references_corporation_id_company_id__idx" ON "machine_meter_reading_references"("corporation_id", "company_id", "machine_id", "reading_id");

ALTER TABLE "machines" ADD CONSTRAINT "machines_corporation_id_fkey"
  FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_ownership_periods" ADD CONSTRAINT "machine_ownership_periods_corporation_id_fkey"
  FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_ownership_periods" ADD CONSTRAINT "machine_ownership_periods_corporation_id_company_id_fkey"
  FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_ownership_periods" ADD CONSTRAINT "machine_ownership_periods_corporation_id_machine_id_fkey"
  FOREIGN KEY ("corporation_id", "machine_id") REFERENCES "machines"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_identifiers" ADD CONSTRAINT "machine_identifiers_corporation_id_fkey"
  FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_identifiers" ADD CONSTRAINT "machine_identifiers_corporation_id_company_id_fkey"
  FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_identifiers" ADD CONSTRAINT "machine_identifiers_corporation_id_machine_id_fkey"
  FOREIGN KEY ("corporation_id", "machine_id") REFERENCES "machines"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_readings" ADD CONSTRAINT "machine_meter_readings_corporation_id_fkey"
  FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_readings" ADD CONSTRAINT "machine_meter_readings_corporation_id_company_id_fkey"
  FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_readings" ADD CONSTRAINT "machine_meter_readings_corporation_id_machine_id_fkey"
  FOREIGN KEY ("corporation_id", "machine_id") REFERENCES "machines"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_readings" ADD CONSTRAINT "machine_meter_readings_corporation_id_actor_user_id_fkey"
  FOREIGN KEY ("corporation_id", "actor_user_id") REFERENCES "users"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_reading_corrections" ADD CONSTRAINT "machine_meter_reading_corrections_corporation_id_fkey"
  FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_reading_corrections" ADD CONSTRAINT "mmr_corrections_company_fkey"
  FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_reading_corrections" ADD CONSTRAINT "machine_meter_reading_corrections_corporation_id_actor_user_id_fkey"
  FOREIGN KEY ("corporation_id", "actor_user_id") REFERENCES "users"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_reading_corrections" ADD CONSTRAINT "mmr_corrections_reading_fkey"
  FOREIGN KEY ("corporation_id", "company_id", "machine_id", "reading_id") REFERENCES "machine_meter_readings"("corporation_id", "company_id", "machine_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_reading_references" ADD CONSTRAINT "machine_meter_reading_references_corporation_id_fkey"
  FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_reading_references" ADD CONSTRAINT "mmr_references_company_fkey"
  FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "machine_meter_reading_references" ADD CONSTRAINT "mmr_references_reading_fkey"
  FOREIGN KEY ("corporation_id", "company_id", "machine_id", "reading_id") REFERENCES "machine_meter_readings"("corporation_id", "company_id", "machine_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
