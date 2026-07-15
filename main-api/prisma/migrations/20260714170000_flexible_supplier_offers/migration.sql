BEGIN;

ALTER TABLE "fuel_suppliers"
  ADD COLUMN "is_global" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "project_id" UUID,
  ADD COLUMN "address_street" VARCHAR(160),
  ADD COLUMN "address_number" VARCHAR(30),
  ADD COLUMN "address_complement" VARCHAR(100),
  ADD COLUMN "address_neighborhood" VARCHAR(100);

UPDATE "fuel_suppliers"
SET "address_street" = "address_line"
WHERE "address_line" IS NOT NULL;

DROP INDEX IF EXISTS "fuel_suppliers_active_document_digest_scope_unique";
CREATE UNIQUE INDEX "fuel_suppliers_active_global_document_digest_scope_unique"
  ON "fuel_suppliers" ("corporation_id", "company_id", "document_digest")
  WHERE "is_active" = true AND "is_global" = true;
CREATE UNIQUE INDEX "fuel_suppliers_active_project_document_digest_scope_unique"
  ON "fuel_suppliers" ("corporation_id", "company_id", "project_id", "document_digest")
  WHERE "is_active" = true AND "is_global" = false;

CREATE TABLE "measurement_units" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID,
  "company_id" UUID,
  "code" VARCHAR(24) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "measurement_units_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "measurement_units_company_fkey" FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "measurement_units_scope_pair_check" CHECK ((corporation_id IS NULL) = (company_id IS NULL))
);
CREATE UNIQUE INDEX "measurement_units_global_code_key" ON "measurement_units" ("code") WHERE "corporation_id" IS NULL AND "company_id" IS NULL;
CREATE UNIQUE INDEX "measurement_units_company_code_key" ON "measurement_units" ("corporation_id", "company_id", "code") WHERE "corporation_id" IS NOT NULL AND "company_id" IS NOT NULL;
CREATE INDEX "measurement_units_scope_active_idx" ON "measurement_units" ("corporation_id", "company_id", "is_active");

CREATE TABLE "supplied_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID,
  "name" VARCHAR(160) NOT NULL,
  "base_unit_id" UUID NOT NULL,
  "is_global" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplied_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplied_items_company_fkey" FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "supplied_items_project_fkey" FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "supplied_items_unit_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT,
  CONSTRAINT "supplied_items_scope_check" CHECK ((is_global AND project_id IS NULL) OR ((NOT is_global) AND project_id IS NOT NULL))
);
CREATE INDEX "supplied_items_global_active_idx" ON "supplied_items" ("corporation_id", "company_id", "is_global", "is_active");
CREATE INDEX "supplied_items_project_idx" ON "supplied_items" ("corporation_id", "company_id", "project_id");
CREATE UNIQUE INDEX "supplied_items_global_name_key" ON "supplied_items" ("corporation_id", "company_id", lower("name")) WHERE "is_global" = true AND "is_active" = true;
CREATE UNIQUE INDEX "supplied_items_project_name_key" ON "supplied_items" ("corporation_id", "company_id", "project_id", lower("name")) WHERE "is_global" = false AND "is_active" = true;

CREATE TABLE "supplier_offers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "purchase_unit_id" UUID NOT NULL,
  "conversion_to_base" NUMERIC(18,6) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_offers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_offers_supplier_fkey" FOREIGN KEY ("corporation_id", "company_id", "supplier_id") REFERENCES "fuel_suppliers"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "supplier_offers_item_fkey" FOREIGN KEY ("item_id") REFERENCES "supplied_items"("id") ON DELETE RESTRICT,
  CONSTRAINT "supplier_offers_purchase_unit_fkey" FOREIGN KEY ("purchase_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT,
  CONSTRAINT "supplier_offers_conversion_check" CHECK ("conversion_to_base" > 0)
);
CREATE INDEX "supplier_offers_supplier_idx" ON "supplier_offers" ("corporation_id", "company_id", "supplier_id");
CREATE INDEX "supplier_offers_item_idx" ON "supplier_offers" ("corporation_id", "company_id", "item_id");
CREATE UNIQUE INDEX "supplier_offers_current_key" ON "supplier_offers" ("supplier_id", "item_id", "purchase_unit_id") WHERE "is_active" = true;

CREATE TABLE "supplier_offer_prices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "offer_id" UUID NOT NULL,
  "price" NUMERIC(18,4) NOT NULL,
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_offer_prices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_offer_prices_offer_fkey" FOREIGN KEY ("offer_id") REFERENCES "supplier_offers"("id") ON DELETE RESTRICT,
  CONSTRAINT "supplier_offer_prices_price_check" CHECK ("price" > 0),
  CONSTRAINT "supplier_offer_prices_period_check" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from")
);
CREATE INDEX "supplier_offer_prices_offer_idx" ON "supplier_offer_prices" ("corporation_id", "company_id", "offer_id");
CREATE UNIQUE INDEX "supplier_offer_prices_current_key" ON "supplier_offer_prices" ("offer_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_supplier_offers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "source_offer_id" UUID,
  "purchase_unit_id" UUID NOT NULL,
  "conversion_to_base" NUMERIC(18,6) NOT NULL,
  "price" NUMERIC(18,4) NOT NULL,
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_supplier_offers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_supplier_offers_project_fkey" FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "project_supplier_offers_supplier_fkey" FOREIGN KEY ("corporation_id", "company_id", "supplier_id") REFERENCES "fuel_suppliers"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "project_supplier_offers_item_fkey" FOREIGN KEY ("item_id") REFERENCES "supplied_items"("id") ON DELETE RESTRICT,
  CONSTRAINT "project_supplier_offers_source_offer_fkey" FOREIGN KEY ("source_offer_id") REFERENCES "supplier_offers"("id") ON DELETE RESTRICT,
  CONSTRAINT "project_supplier_offers_purchase_unit_fkey" FOREIGN KEY ("purchase_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT,
  CONSTRAINT "project_supplier_offers_conversion_check" CHECK ("conversion_to_base" > 0),
  CONSTRAINT "project_supplier_offers_price_check" CHECK ("price" > 0),
  CONSTRAINT "project_supplier_offers_period_check" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from")
);
CREATE INDEX "project_supplier_offers_project_idx" ON "project_supplier_offers" ("corporation_id", "company_id", "project_id");
CREATE INDEX "project_supplier_offers_supplier_idx" ON "project_supplier_offers" ("corporation_id", "company_id", "supplier_id");
CREATE UNIQUE INDEX "project_supplier_offers_current_key" ON "project_supplier_offers" ("project_id", "supplier_id", "item_id", "purchase_unit_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_supplier_offer_prices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_offer_id" UUID NOT NULL,
  "price" NUMERIC(18,4) NOT NULL,
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_supplier_offer_prices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_supplier_offer_prices_offer_fkey" FOREIGN KEY ("project_offer_id") REFERENCES "project_supplier_offers"("id") ON DELETE RESTRICT,
  CONSTRAINT "project_supplier_offer_prices_price_check" CHECK ("price" > 0),
  CONSTRAINT "project_supplier_offer_prices_period_check" CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from")
);
CREATE INDEX "project_supplier_offer_prices_offer_idx" ON "project_supplier_offer_prices" ("corporation_id", "company_id", "project_offer_id");
CREATE UNIQUE INDEX "project_supplier_offer_prices_current_key" ON "project_supplier_offer_prices" ("project_offer_id") WHERE "effective_to" IS NULL;

INSERT INTO "measurement_units" ("id", "code", "name", "updated_at")
VALUES
  ('00000000-0000-4000-8000-00000000a001', 'L', 'Litro', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-00000000a002', 'UN', 'Unidade', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-00000000a003', 'KG', 'Quilograma', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-00000000a004', 'T', 'Tonelada', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-00000000a005', 'M3', 'Metro cúbico', CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-00000000a006', 'H', 'Hora', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

INSERT INTO "supplied_items" ("corporation_id", "company_id", "name", "base_unit_id", "is_global", "updated_at")
SELECT DISTINCT fs."corporation_id", fs."company_id", 'Diesel S10', '00000000-0000-4000-8000-00000000a001'::uuid, true, CURRENT_TIMESTAMP
FROM "fuel_suppliers" fs
ON CONFLICT DO NOTHING;

INSERT INTO "supplied_items" ("corporation_id", "company_id", "name", "base_unit_id", "is_global", "updated_at")
SELECT DISTINCT fs."corporation_id", fs."company_id", 'Diesel S500', '00000000-0000-4000-8000-00000000a001'::uuid, true, CURRENT_TIMESTAMP
FROM "fuel_suppliers" fs
ON CONFLICT DO NOTHING;

INSERT INTO "project_supplier_offers" (
  "corporation_id", "company_id", "project_id", "supplier_id", "item_id",
  "purchase_unit_id", "conversion_to_base", "price", "effective_from", "effective_to"
)
SELECT
  pfa."corporation_id",
  pfa."company_id",
  pfa."project_id",
  pfa."fuel_supplier_id",
  si."id",
  '00000000-0000-4000-8000-00000000a001'::uuid,
  1,
  pfp."price_per_liter",
  pfp."effective_from",
  pfp."effective_to"
FROM "project_fuel_agreements" pfa
JOIN "project_fuel_prices" pfp ON pfp."agreement_id" = pfa."id"
JOIN "supplied_items" si ON si."corporation_id" = pfa."corporation_id"
  AND si."company_id" = pfa."company_id"
  AND si."name" = CASE pfp."fuel_type_id"
    WHEN 'diesel-s500' THEN 'Diesel S500'
    ELSE 'Diesel S10'
  END;

INSERT INTO "project_supplier_offer_prices" (
  "corporation_id", "company_id", "project_offer_id", "price", "effective_from", "effective_to"
)
SELECT "corporation_id", "company_id", "id", "price", "effective_from", "effective_to"
FROM "project_supplier_offers";

COMMIT;
