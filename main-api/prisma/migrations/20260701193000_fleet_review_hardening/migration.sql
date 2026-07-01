DROP INDEX "machine_ownership_periods_open_period_unique";

CREATE UNIQUE INDEX "machine_ownership_periods_open_period_unique"
  ON "machine_ownership_periods"("corporation_id", "machine_id")
  WHERE "effective_to" IS NULL;

ALTER TABLE "machine_meter_readings"
  ADD COLUMN "reading_sequence" INTEGER;

WITH ordered_readings AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "corporation_id", "machine_id"
      ORDER BY "recorded_at", "id"
    ) AS "reading_sequence"
  FROM "machine_meter_readings"
)
UPDATE "machine_meter_readings" AS readings
SET "reading_sequence" = ordered_readings."reading_sequence"
FROM ordered_readings
WHERE readings."id" = ordered_readings."id";

ALTER TABLE "machine_meter_readings"
  ALTER COLUMN "reading_sequence" SET NOT NULL;

DROP INDEX "machine_meter_readings_corporation_id_company_id_machine_id_idx";

CREATE UNIQUE INDEX "machine_meter_readings_corporation_id_machine_id_sequence_key"
  ON "machine_meter_readings"("corporation_id", "machine_id", "reading_sequence");

CREATE INDEX "machine_meter_readings_corporation_id_company_id_machine_id_idx"
  ON "machine_meter_readings"(
    "corporation_id",
    "company_id",
    "machine_id",
    "reading_sequence"
  );
