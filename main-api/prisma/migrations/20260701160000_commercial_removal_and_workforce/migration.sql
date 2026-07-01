-- Commercial irreversible removal metadata
ALTER TABLE "clients" ADD COLUMN "removed_at" TIMESTAMPTZ(3);
ALTER TABLE "clients" ADD COLUMN "removed_by_user_id" UUID;
ALTER TABLE "fuel_suppliers" ADD COLUMN "removed_at" TIMESTAMPTZ(3);
ALTER TABLE "fuel_suppliers" ADD COLUMN "removed_by_user_id" UUID;

ALTER TABLE "clients" ADD CONSTRAINT "clients_corporation_id_removed_by_user_id_fkey"
  FOREIGN KEY ("corporation_id", "removed_by_user_id")
  REFERENCES "users"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fuel_suppliers" ADD CONSTRAINT "fuel_suppliers_corporation_id_removed_by_user_id_fkey"
  FOREIGN KEY ("corporation_id", "removed_by_user_id")
  REFERENCES "users"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "clients_removed_at_idx" ON "clients"("removed_at");
CREATE INDEX "fuel_suppliers_removed_at_idx" ON "fuel_suppliers"("removed_at");

-- Workforce identity and employment registry
CREATE TYPE "employment_state" AS ENUM ('ACTIVE', 'TERMINATED');

CREATE TABLE "persons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "document_type" "sensitive_document_type" NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" VARCHAR(64) NOT NULL,
  "auth_tag" VARCHAR(64) NOT NULL,
  "encryption_key_version" VARCHAR(64) NOT NULL,
  "document_digest" VARCHAR(96) NOT NULL,
  "display_name" VARCHAR(180) NOT NULL,
  "full_name" VARCHAR(180) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "person_id" UUID NOT NULL,
  "company_registration_number" VARCHAR(80) NOT NULL,
  "state" "employment_state" NOT NULL DEFAULT 'ACTIVE',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "terminated_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "employments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employment_periods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "employment_id" UUID NOT NULL,
  "admission_date" DATE NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "termination_reason" VARCHAR(240),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "employment_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "persons_corporation_id_id_key" ON "persons"("corporation_id", "id");
CREATE UNIQUE INDEX "persons_corporation_id_document_digest_key" ON "persons"("corporation_id", "document_digest");
CREATE INDEX "persons_corporation_id_display_name_id_idx" ON "persons"("corporation_id", "display_name", "id");
CREATE INDEX "persons_document_digest_idx" ON "persons"("document_digest");

CREATE UNIQUE INDEX "employments_corporation_id_company_id_id_key" ON "employments"("corporation_id", "company_id", "id");
CREATE INDEX "employments_corporation_id_company_id_is_active_idx" ON "employments"("corporation_id", "company_id", "is_active");
CREATE INDEX "employments_corporation_id_company_id_created_at_id_idx" ON "employments"("corporation_id", "company_id", "created_at", "id");
CREATE INDEX "employments_corporation_id_company_id_company_registration_number_idx" ON "employments"("corporation_id", "company_id", "company_registration_number");
CREATE INDEX "employments_corporation_id_person_id_idx" ON "employments"("corporation_id", "person_id");
CREATE UNIQUE INDEX "employments_active_person_company_unique" ON "employments"("corporation_id", "company_id", "person_id") WHERE "is_active" = true;
CREATE UNIQUE INDEX "employments_active_registration_number_company_unique" ON "employments"("corporation_id", "company_id", "company_registration_number") WHERE "is_active" = true;

CREATE INDEX "employment_periods_corporation_id_company_id_employment_id_idx" ON "employment_periods"("corporation_id", "company_id", "employment_id");
CREATE INDEX "employment_periods_corporation_id_company_id_effective_from_id_idx" ON "employment_periods"("corporation_id", "company_id", "effective_from", "id");
CREATE UNIQUE INDEX "employment_periods_open_period_unique" ON "employment_periods"("corporation_id", "company_id", "employment_id") WHERE "effective_to" IS NULL;

ALTER TABLE "persons" ADD CONSTRAINT "persons_corporation_id_fkey"
  FOREIGN KEY ("corporation_id")
  REFERENCES "corporations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employments" ADD CONSTRAINT "employments_corporation_id_fkey"
  FOREIGN KEY ("corporation_id")
  REFERENCES "corporations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employments" ADD CONSTRAINT "employments_corporation_id_company_id_fkey"
  FOREIGN KEY ("corporation_id", "company_id")
  REFERENCES "companies"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employments" ADD CONSTRAINT "employments_corporation_id_person_id_fkey"
  FOREIGN KEY ("corporation_id", "person_id")
  REFERENCES "persons"("corporation_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employment_periods" ADD CONSTRAINT "employment_periods_corporation_id_company_id_employment_id_fkey"
  FOREIGN KEY ("corporation_id", "company_id", "employment_id")
  REFERENCES "employments"("corporation_id", "company_id", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
