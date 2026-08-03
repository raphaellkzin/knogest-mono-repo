CREATE TYPE "project_production_status" AS ENUM ('DRAFT', 'APPROVED');
CREATE TYPE "project_production_entry_mode" AS ENUM ('DIRECT_TOTAL', 'TRIPS');
CREATE TYPE "project_production_volume_condition" AS ENUM ('CUT', 'LOOSE', 'COMPACTED');
CREATE TYPE "project_production_profile" AS ENUM ('GENERIC', 'EXCAVATION', 'LOADING', 'TRANSPORT', 'SPREADING', 'GRADING', 'COMPACTION');
CREATE TYPE "project_production_dmt_policy" AS ENUM ('NOT_APPLICABLE', 'OPTIONAL', 'REQUIRED');
CREATE TYPE "project_production_equipment_role" AS ENUM ('EXCAVATION', 'LOADING', 'TRANSPORT', 'SPREADING', 'GRADING', 'COMPACTION', 'WATERING', 'SUPPORT');
CREATE TYPE "project_production_revision_event" AS ENUM ('CREATED', 'UPDATED', 'APPROVED', 'DIRECT_APPROVED', 'REOPENED', 'TRIP_ADDED', 'TRIP_REMOVED', 'RDO_CONFIRMED');

ALTER TABLE "project_work_front_services"
  ADD COLUMN "production_profile" "project_production_profile" NOT NULL DEFAULT 'GENERIC',
  ADD COLUMN "dmt_policy" "project_production_dmt_policy" NOT NULL DEFAULT 'OPTIONAL';

CREATE TABLE "project_productions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "work_front_id" UUID NOT NULL,
  "work_front_service_id" UUID NOT NULL,
  "service_code_snapshot" VARCHAR(48) NOT NULL,
  "unit_code_snapshot" VARCHAR(32) NOT NULL,
  "production_profile_snapshot" "project_production_profile" NOT NULL,
  "dmt_policy_snapshot" "project_production_dmt_policy" NOT NULL,
  "production_date" DATE NOT NULL,
  "shift" "project_daily_report_shift" NOT NULL,
  "shift_order" INTEGER NOT NULL,
  "status" "project_production_status" NOT NULL DEFAULT 'DRAFT',
  "entry_mode" "project_production_entry_mode" NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "start_time" VARCHAR(5),
  "end_time" VARCHAR(5),
  "end_day_offset" INTEGER NOT NULL DEFAULT 0,
  "responsible_employment_id" UUID,
  "responsible_name_snapshot" VARCHAR(180),
  "location" VARCHAR(240),
  "start_station" VARCHAR(80),
  "end_station" VARCHAR(80),
  "layer" VARCHAR(80),
  "elevation" VARCHAR(80),
  "material_name" VARCHAR(160),
  "material_category" VARCHAR(120),
  "volume_condition" "project_production_volume_condition",
  "direct_quantity" DECIMAL(18,3),
  "measured_quantity" DECIMAL(18,3),
  "conversion_factor" DECIMAL(12,6),
  "origin" VARCHAR(240),
  "destination" VARCHAR(240),
  "dmt_km" DECIMAL(10,3),
  "layer_thickness_cm" DECIMAL(10,2),
  "compaction_passes" INTEGER,
  "moisture_condition" VARCHAR(120),
  "evidence" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "notes" TEXT,
  "created_by_user_id" UUID NOT NULL,
  "approved_by_user_id" UUID,
  "approved_at" TIMESTAMPTZ(3),
  "last_reopen_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "project_productions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_productions_project_fkey" FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "project_productions_front_fkey" FOREIGN KEY ("corporation_id", "company_id", "project_id", "work_front_id") REFERENCES "project_work_fronts"("corporation_id", "company_id", "project_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "project_productions_service_fkey" FOREIGN KEY ("work_front_service_id") REFERENCES "project_work_front_services"("id") ON DELETE RESTRICT,
  CONSTRAINT "project_productions_responsible_fkey" FOREIGN KEY ("corporation_id", "company_id", "responsible_employment_id") REFERENCES "employments"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "project_productions_created_by_fkey" FOREIGN KEY ("corporation_id", "created_by_user_id") REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "project_productions_approved_by_fkey" FOREIGN KEY ("corporation_id", "approved_by_user_id") REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "project_productions_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "project_productions_end_day_offset_check" CHECK ("end_day_offset" BETWEEN 0 AND 1),
  CONSTRAINT "project_productions_positive_values_check" CHECK (
    ("direct_quantity" IS NULL OR "direct_quantity" >= 0) AND
    ("measured_quantity" IS NULL OR "measured_quantity" >= 0) AND
    ("conversion_factor" IS NULL OR "conversion_factor" > 0) AND
    ("dmt_km" IS NULL OR "dmt_km" >= 0) AND
    ("layer_thickness_cm" IS NULL OR "layer_thickness_cm" >= 0) AND
    ("compaction_passes" IS NULL OR "compaction_passes" >= 0)
  )
);

CREATE UNIQUE INDEX "project_productions_scope_id_uq" ON "project_productions"("corporation_id", "company_id", "project_id", "id");
CREATE INDEX "project_productions_project_date_idx" ON "project_productions"("corporation_id", "company_id", "project_id", "production_date", "shift_order", "id");
CREATE INDEX "project_productions_front_status_idx" ON "project_productions"("corporation_id", "company_id", "project_id", "work_front_id", "status");
CREATE INDEX "project_productions_service_status_idx" ON "project_productions"("corporation_id", "company_id", "project_id", "service_code_snapshot", "status");

CREATE TABLE "project_production_equipment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "production_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "machine_name_snapshot" VARCHAR(160) NOT NULL,
  "manufacturer_snapshot" VARCHAR(120) NOT NULL,
  "model_snapshot" VARCHAR(120) NOT NULL,
  "identifier_snapshot" VARCHAR(80),
  "meter_type_snapshot" "machine_meter_type" NOT NULL,
  "role" "project_production_equipment_role" NOT NULL,
  "operator_employment_id" UUID,
  "operator_name_snapshot" VARCHAR(180),
  "initial_meter_value" DECIMAL(14,2),
  "final_meter_value" DECIMAL(14,2),
  "worked_minutes" INTEGER,
  "default_trip_capacity_m3" DECIMAL(10,3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "project_production_equipment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_production_equipment_production_fkey" FOREIGN KEY ("production_id") REFERENCES "project_productions"("id") ON DELETE CASCADE,
  CONSTRAINT "project_production_equipment_machine_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE RESTRICT,
  CONSTRAINT "project_production_equipment_positive_check" CHECK (
    ("initial_meter_value" IS NULL OR "initial_meter_value" >= 0) AND
    ("final_meter_value" IS NULL OR "final_meter_value" >= 0) AND
    ("worked_minutes" IS NULL OR "worked_minutes" BETWEEN 0 AND 1440) AND
    ("default_trip_capacity_m3" IS NULL OR "default_trip_capacity_m3" > 0)
  )
);
CREATE UNIQUE INDEX "project_production_equipment_machine_uq" ON "project_production_equipment"("production_id", "machine_id");
CREATE INDEX "project_production_equipment_machine_idx" ON "project_production_equipment"("machine_id");

CREATE TABLE "project_production_stops" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "production_equipment_id" UUID NOT NULL,
  "duration_minutes" INTEGER NOT NULL,
  "reason" VARCHAR(160) NOT NULL,
  "notes" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_production_stops_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_production_stops_equipment_fkey" FOREIGN KEY ("production_equipment_id") REFERENCES "project_production_equipment"("id") ON DELETE CASCADE,
  CONSTRAINT "project_production_stops_duration_check" CHECK ("duration_minutes" > 0 AND "duration_minutes" <= 1440)
);
CREATE INDEX "project_production_stops_equipment_idx" ON "project_production_stops"("production_equipment_id");

CREATE TABLE "project_production_trips" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "production_id" UUID NOT NULL,
  "production_equipment_id" UUID NOT NULL,
  "idempotency_key" UUID NOT NULL,
  "recorded_at" TIMESTAMPTZ(3) NOT NULL,
  "capacity_m3" DECIMAL(10,3) NOT NULL,
  "adjusted_volume_m3" DECIMAL(10,3),
  "ticket_number" VARCHAR(80),
  "notes" VARCHAR(500),
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_production_trips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_production_trips_production_fkey" FOREIGN KEY ("production_id") REFERENCES "project_productions"("id") ON DELETE CASCADE,
  CONSTRAINT "project_production_trips_equipment_fkey" FOREIGN KEY ("production_equipment_id") REFERENCES "project_production_equipment"("id") ON DELETE RESTRICT,
  CONSTRAINT "project_production_trips_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "project_production_trips_volume_check" CHECK ("capacity_m3" > 0 AND ("adjusted_volume_m3" IS NULL OR "adjusted_volume_m3" > 0))
);
CREATE UNIQUE INDEX "project_production_trip_idempotency_uq" ON "project_production_trips"("production_id", "idempotency_key");
CREATE INDEX "project_production_trips_recorded_idx" ON "project_production_trips"("production_id", "recorded_at", "id");

CREATE TABLE "project_production_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "production_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL,
  "event" "project_production_revision_event" NOT NULL,
  "reason" VARCHAR(500),
  "snapshot" JSONB NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_production_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_production_revisions_production_fkey" FOREIGN KEY ("production_id") REFERENCES "project_productions"("id") ON DELETE CASCADE,
  CONSTRAINT "project_production_revisions_actor_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "project_production_revision_uq" ON "project_production_revisions"("production_id", "revision");
CREATE INDEX "project_production_revisions_created_idx" ON "project_production_revisions"("production_id", "created_at");

CREATE TABLE "project_daily_report_productions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "daily_report_id" UUID NOT NULL,
  "production_id" UUID NOT NULL,
  "confirmed_revision" INTEGER NOT NULL,
  "is_stale" BOOLEAN NOT NULL DEFAULT false,
  "confirmed_by_user_id" UUID NOT NULL,
  "confirmed_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "project_daily_report_productions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_daily_report_productions_report_fkey" FOREIGN KEY ("daily_report_id") REFERENCES "project_daily_reports"("id") ON DELETE CASCADE,
  CONSTRAINT "project_daily_report_productions_production_fkey" FOREIGN KEY ("production_id") REFERENCES "project_productions"("id") ON DELETE RESTRICT,
  CONSTRAINT "project_daily_report_productions_actor_fkey" FOREIGN KEY ("confirmed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "project_daily_report_production_uq" ON "project_daily_report_productions"("daily_report_id", "production_id");
CREATE INDEX "project_daily_report_productions_stale_idx" ON "project_daily_report_productions"("daily_report_id", "is_stale");
