-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "corporations" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "domains" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "sensitive_document_protection_harness" RENAME CONSTRAINT "sensitive_document_protection_harness_company_fk" TO "sensitive_document_protection_harness_corporation_id_compa_fkey";

-- RenameForeignKey
ALTER TABLE "sensitive_document_protection_harness" RENAME CONSTRAINT "sensitive_document_protection_harness_corporation_fk" TO "sensitive_document_protection_harness_corporation_id_fkey";

-- RenameIndex
ALTER INDEX "sensitive_document_protection_harness_scope_idx" RENAME TO "sensitive_document_protection_harness_corporation_id_compan_idx";
