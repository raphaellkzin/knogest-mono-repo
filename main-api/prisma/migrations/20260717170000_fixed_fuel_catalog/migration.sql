BEGIN;

ALTER TABLE "supplied_item_categories"
  ADD COLUMN "system_key" VARCHAR(32);

UPDATE "supplied_item_categories"
SET "name" = 'Combustíveis', "is_active" = true, "system_key" = 'fuel'
WHERE "id" IN (
  SELECT DISTINCT ON ("corporation_id", "company_id") "id"
  FROM "supplied_item_categories"
  WHERE "parent_id" IS NULL AND lower("name") = lower('Combustíveis')
  ORDER BY "corporation_id", "company_id", "is_active" DESC, "created_at" ASC
);

INSERT INTO "supplied_item_categories" (
  "corporation_id", "company_id", "name", "system_key", "updated_at"
)
SELECT c."corporation_id", c."id", 'Combustíveis', 'fuel', CURRENT_TIMESTAMP
FROM "companies" c
WHERE NOT EXISTS (
  SELECT 1
  FROM "supplied_item_categories" sic
  WHERE sic."corporation_id" = c."corporation_id"
    AND sic."company_id" = c."id"
    AND sic."system_key" = 'fuel'
);

WITH fuel_roots AS (
  SELECT "corporation_id", "company_id", "id"
  FROM "supplied_item_categories"
  WHERE "system_key" = 'fuel'
), classified_items AS (
  SELECT DISTINCT "item_id"
  FROM "project_supplier_offers"
  WHERE "usage_kind" = 'fuel'
)
UPDATE "supplied_items" si
SET "category_id" = fr."id", "updated_at" = CURRENT_TIMESTAMP
FROM fuel_roots fr
WHERE fr."corporation_id" = si."corporation_id"
  AND fr."company_id" = si."company_id"
  AND (
    lower(si."name") IN (
      lower('Diesel S10'), lower('Diesel S500'), lower('Gasolina comum'),
      lower('Etanol'), lower('ARLA 32')
    )
    OR si."id" IN (SELECT "item_id" FROM classified_items)
  );

INSERT INTO "supplied_items" (
  "corporation_id", "company_id", "category_id", "name", "base_unit_id",
  "is_global", "updated_at"
)
SELECT fr."corporation_id", fr."company_id", fr."id", defaults."name",
  '00000000-0000-4000-8000-00000000a001'::uuid, true, CURRENT_TIMESTAMP
FROM (
  SELECT "corporation_id", "company_id", "id"
  FROM "supplied_item_categories"
  WHERE "system_key" = 'fuel'
) fr
CROSS JOIN (VALUES
  ('Diesel S10'),
  ('Diesel S500'),
  ('Gasolina comum'),
  ('Etanol'),
  ('ARLA 32')
) defaults("name")
WHERE NOT EXISTS (
  SELECT 1
  FROM "supplied_items" si
  WHERE si."corporation_id" = fr."corporation_id"
    AND si."company_id" = fr."company_id"
    AND lower(si."name") = lower(defaults."name")
);

WITH RECURSIVE fuel_categories AS (
  SELECT "id", "corporation_id", "company_id"
  FROM "supplied_item_categories"
  WHERE "system_key" = 'fuel'
  UNION ALL
  SELECT child."id", child."corporation_id", child."company_id"
  FROM "supplied_item_categories" child
  JOIN fuel_categories parent ON child."parent_id" = parent."id"
), fuel_items AS (
  SELECT si."id"
  FROM "supplied_items" si
  JOIN fuel_categories fc ON fc."id" = si."category_id"
)
UPDATE "project_supplier_offers"
SET "usage_kind" = CASE
  WHEN "item_id" IN (SELECT "id" FROM fuel_items) THEN 'fuel'
  ELSE 'material'
END;

ALTER TABLE "supplied_item_categories"
  ADD CONSTRAINT "supplied_item_categories_system_key_check"
  CHECK (
    "system_key" IS NULL OR (
      "system_key" = 'fuel'
      AND "parent_id" IS NULL
      AND "is_active" = true
      AND "name" = 'Combustíveis'
    )
  );

CREATE UNIQUE INDEX "supplied_item_categories_system_key_unique"
  ON "supplied_item_categories" ("corporation_id", "company_id", "system_key")
  WHERE "system_key" IS NOT NULL;

COMMIT;
