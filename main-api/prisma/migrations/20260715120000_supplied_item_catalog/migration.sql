BEGIN;

CREATE TABLE "supplied_item_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "parent_id" UUID,
  "name" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplied_item_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplied_item_categories_company_fkey" FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "supplied_item_categories_parent_fkey" FOREIGN KEY ("parent_id") REFERENCES "supplied_item_categories"("id") ON DELETE RESTRICT
);

CREATE INDEX "supplied_item_categories_parent_idx" ON "supplied_item_categories" ("corporation_id", "company_id", "parent_id");
CREATE INDEX "supplied_item_categories_active_idx" ON "supplied_item_categories" ("corporation_id", "company_id", "is_active");
CREATE UNIQUE INDEX "supplied_item_categories_root_name_key"
  ON "supplied_item_categories" ("corporation_id", "company_id", lower("name"))
  WHERE "parent_id" IS NULL AND "is_active" = true;
CREATE UNIQUE INDEX "supplied_item_categories_parent_name_key"
  ON "supplied_item_categories" ("corporation_id", "company_id", "parent_id", lower("name"))
  WHERE "parent_id" IS NOT NULL AND "is_active" = true;

ALTER TABLE "supplied_items"
  ADD COLUMN "category_id" UUID,
  ADD COLUMN "value_unit_quantity" NUMERIC(18,6) NOT NULL DEFAULT 1.000000,
  ADD COLUMN "base_price" NUMERIC(18,4) NOT NULL DEFAULT 0.0000,
  ADD CONSTRAINT "supplied_items_category_fkey" FOREIGN KEY ("category_id") REFERENCES "supplied_item_categories"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "supplied_items_value_unit_quantity_check" CHECK ("value_unit_quantity" > 0),
  ADD CONSTRAINT "supplied_items_base_price_check" CHECK ("base_price" >= 0);

CREATE INDEX "supplied_items_category_idx" ON "supplied_items" ("corporation_id", "company_id", "category_id");

COMMIT;
