BEGIN;

ALTER TABLE "project_supplier_offers"
  ADD COLUMN "usage_kind" varchar(16) NOT NULL DEFAULT 'material';

UPDATE "project_supplier_offers" pso
SET "usage_kind" = 'fuel'
FROM "supplied_items" si
WHERE si."id" = pso."item_id"
  AND lower(si."name") IN ('diesel s10', 'diesel s500');

ALTER TABLE "project_supplier_offers"
  ADD CONSTRAINT "project_supplier_offers_usage_kind_check"
  CHECK ("usage_kind" IN ('fuel', 'material'));

CREATE INDEX "project_supplier_offers_usage_idx"
  ON "project_supplier_offers" ("corporation_id", "company_id", "project_id", "usage_kind");

COMMIT;
