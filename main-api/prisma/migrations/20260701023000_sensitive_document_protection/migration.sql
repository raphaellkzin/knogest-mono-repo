CREATE TYPE "sensitive_document_type" AS ENUM ('CPF', 'CNPJ');

CREATE TABLE "sensitive_document_protection_harness" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corporation_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "registry_type" VARCHAR(64) NOT NULL,
    "document_type" "sensitive_document_type" NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" VARCHAR(64) NOT NULL,
    "auth_tag" VARCHAR(64) NOT NULL,
    "encryption_key_version" VARCHAR(64) NOT NULL,
    "document_digest" VARCHAR(96) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sensitive_document_protection_harness_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sensitive_document_protection_harness_scope_idx"
    ON "sensitive_document_protection_harness" ("corporation_id", "company_id", "registry_type");

CREATE INDEX "sensitive_document_protection_harness_document_digest_idx"
    ON "sensitive_document_protection_harness" ("document_digest");

CREATE UNIQUE INDEX "sensitive_document_protection_harness_active_unique_idx"
    ON "sensitive_document_protection_harness" ("corporation_id", "company_id", "registry_type", "document_digest")
    WHERE "is_active" = true;

ALTER TABLE "sensitive_document_protection_harness"
    ADD CONSTRAINT "sensitive_document_protection_harness_corporation_fk"
    FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sensitive_document_protection_harness"
    ADD CONSTRAINT "sensitive_document_protection_harness_company_fk"
    FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
