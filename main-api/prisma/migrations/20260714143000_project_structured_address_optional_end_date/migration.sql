BEGIN;

ALTER TABLE "projects"
  ADD COLUMN "address_postal_code" varchar(8),
  ADD COLUMN "address_street" varchar(160),
  ADD COLUMN "address_number" varchar(30),
  ADD COLUMN "address_complement" varchar(100),
  ADD COLUMN "address_neighborhood" varchar(100),
  ADD COLUMN "address_city" varchar(100),
  ADD COLUMN "address_state" char(2);

ALTER TABLE "project_baselines"
  ALTER COLUMN "planned_end_date" DROP NOT NULL;

ALTER TABLE "project_baselines"
  ADD CONSTRAINT "project_baselines_planned_dates_check"
  CHECK ("planned_end_date" IS NULL OR "planned_end_date" >= "planned_start_date");

COMMIT;
