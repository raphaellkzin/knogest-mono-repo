ALTER TABLE "machines"
  ADD COLUMN "load_volume_m3" DECIMAL(10,3),
  ADD COLUMN "max_supported_weight_t" DECIMAL(10,3);

ALTER TABLE "machines"
  ADD CONSTRAINT "machines_load_volume_m3_positive_check"
    CHECK ("load_volume_m3" IS NULL OR "load_volume_m3" > 0),
  ADD CONSTRAINT "machines_max_supported_weight_t_positive_check"
    CHECK ("max_supported_weight_t" IS NULL OR "max_supported_weight_t" > 0),
  ADD CONSTRAINT "machines_load_spec_white_line_check"
    CHECK (
      "type" = 'WHITE_LINE'
      OR ("load_volume_m3" IS NULL AND "max_supported_weight_t" IS NULL)
    );

ALTER TABLE "project_quantity_baseline_items"
  ALTER COLUMN "total" TYPE DECIMAL(18,3);

ALTER TABLE "project_production_metric_targets"
  ALTER COLUMN "target_total" TYPE DECIMAL(18,3);

ALTER TABLE "project_work_front_services"
  ALTER COLUMN "quantity" TYPE DECIMAL(18,3);

ALTER TABLE "project_productions"
  ADD COLUMN "official_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0;

UPDATE "project_productions" AS production
SET "official_quantity" = ROUND(
  COALESCE(
    production."measured_quantity",
    CASE
      WHEN production."entry_mode" = 'DIRECT_TOTAL'
        THEN COALESCE(production."direct_quantity", 0)
      WHEN UPPER(production."unit_code_snapshot") ~ '^M3(_|$)'
        THEN COALESCE((
          SELECT SUM(COALESCE(trip."adjusted_volume_m3", trip."capacity_m3"))
          FROM "project_production_trips" AS trip
          WHERE trip."production_id" = production."id"
        ), 0)
      WHEN production."conversion_factor" IS NOT NULL
        THEN COALESCE((
          SELECT SUM(COALESCE(trip."adjusted_volume_m3", trip."capacity_m3"))
          FROM "project_production_trips" AS trip
          WHERE trip."production_id" = production."id"
        ), 0) * production."conversion_factor"
      ELSE 0
    END
  ),
  3
);

CREATE INDEX "project_productions_front_service_quantity_idx"
  ON "project_productions" (
    "corporation_id",
    "company_id",
    "project_id",
    "work_front_id",
    "service_code_snapshot"
  );
