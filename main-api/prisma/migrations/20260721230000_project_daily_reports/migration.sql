CREATE TYPE "project_daily_report_shift" AS ENUM ('DAY', 'NIGHT');
CREATE TYPE "project_daily_report_status" AS ENUM ('DRAFT', 'FINALIZED');
CREATE TYPE "project_daily_report_activity_type" AS ENUM ('EARTHWORKS', 'DRAINAGE', 'PAVING');
CREATE TYPE "project_daily_report_climate_condition" AS ENUM ('RAIN', 'DRY', 'WATERLOGGED_SOIL');

CREATE TABLE "project_daily_reports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "report_date" date NOT NULL,
  "shift" "project_daily_report_shift" NOT NULL,
  "shift_order" integer NOT NULL,
  "status" "project_daily_report_status" NOT NULL DEFAULT 'DRAFT',
  "project_name_snapshot" varchar(160) NOT NULL,
  "municipality_snapshot" varchar(100),
  "state_snapshot" char(2),
  "contract_snapshot" varchar(120),
  "schedule_scale_snapshot" varchar(120) NOT NULL,
  "supervisor_employment_id" uuid NOT NULL,
  "supervisor_name_snapshot" varchar(180) NOT NULL,
  "activity_start_time" varchar(5) NOT NULL,
  "activity_end_time" varchar(5) NOT NULL,
  "activity_end_day_offset" integer NOT NULL DEFAULT 0,
  "activity_types" "project_daily_report_activity_type"[] NOT NULL,
  "climate_conditions" "project_daily_report_climate_condition"[] NOT NULL,
  "daily_rainfall_mm" numeric(10,2) NOT NULL DEFAULT 0,
  "monthly_rainfall_mm" numeric(10,2) NOT NULL DEFAULT 0,
  "executed_activities" text NOT NULL,
  "interferences" text,
  "created_by_user_id" uuid NOT NULL,
  "finalized_by_user_id" uuid,
  "finalized_at" timestamptz(3),
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL,
  CONSTRAINT "project_daily_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pdr_activity_time_format_check" CHECK ("activity_start_time" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' AND "activity_end_time" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT "pdr_activity_day_offset_check" CHECK ("activity_end_day_offset" BETWEEN 0 AND 1),
  CONSTRAINT "pdr_shift_order_check" CHECK (("shift" = 'DAY' AND "shift_order" = 0) OR ("shift" = 'NIGHT' AND "shift_order" = 1)),
  CONSTRAINT "pdr_rainfall_check" CHECK ("daily_rainfall_mm" >= 0 AND "monthly_rainfall_mm" >= 0),
  CONSTRAINT "pdr_finalization_check" CHECK (("status" = 'DRAFT' AND "finalized_at" IS NULL AND "finalized_by_user_id" IS NULL) OR ("status" = 'FINALIZED' AND "finalized_at" IS NOT NULL AND "finalized_by_user_id" IS NOT NULL))
);

CREATE UNIQUE INDEX "pdr_scope_id_uq" ON "project_daily_reports" ("corporation_id", "company_id", "project_id", "id");
CREATE UNIQUE INDEX "pdr_project_date_shift_uq" ON "project_daily_reports" ("corporation_id", "company_id", "project_id", "report_date", "shift");
CREATE INDEX "pdr_project_date_idx" ON "project_daily_reports" ("corporation_id", "company_id", "project_id", "report_date", "id");

CREATE TABLE "project_daily_report_schedule_periods" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "daily_report_id" uuid NOT NULL,
  "position" integer NOT NULL,
  "start_time" varchar(5) NOT NULL,
  "end_time" varchar(5) NOT NULL,
  "start_day_offset" integer NOT NULL DEFAULT 0,
  "end_day_offset" integer NOT NULL DEFAULT 0,
  CONSTRAINT "project_daily_report_schedule_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pdrsp_time_format_check" CHECK ("start_time" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' AND "end_time" ~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT "pdrsp_day_offset_check" CHECK ("start_day_offset" BETWEEN 0 AND 1 AND "end_day_offset" BETWEEN 0 AND 1)
);
CREATE UNIQUE INDEX "pdrsp_report_position_uq" ON "project_daily_report_schedule_periods" ("daily_report_id", "position");
CREATE INDEX "project_daily_report_schedule_periods_scope_idx" ON "project_daily_report_schedule_periods" ("corporation_id", "company_id", "project_id", "daily_report_id");

CREATE TABLE "project_daily_report_technical_responsibilities" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "daily_report_id" uuid NOT NULL,
  "employment_id" uuid NOT NULL,
  "name_snapshot" varchar(180) NOT NULL,
  "position" integer NOT NULL,
  CONSTRAINT "project_daily_report_technical_responsibilities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pdrtr_report_employment_uq" ON "project_daily_report_technical_responsibilities" ("daily_report_id", "employment_id");
CREATE UNIQUE INDEX "pdrtr_report_position_uq" ON "project_daily_report_technical_responsibilities" ("daily_report_id", "position");
CREATE INDEX "project_daily_report_technical_responsibilities_scope_idx" ON "project_daily_report_technical_responsibilities" ("corporation_id", "company_id", "project_id", "daily_report_id");

CREATE TABLE "project_daily_report_employees" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "daily_report_id" uuid NOT NULL,
  "employment_id" uuid NOT NULL,
  "employee_name_snapshot" varchar(180) NOT NULL,
  "job_role_snapshot" varchar(120) NOT NULL,
  "expected_daily_workload_minutes" integer NOT NULL,
  "completed_full_shift" boolean NOT NULL,
  "regular_worked_minutes" integer NOT NULL,
  "overtime_minutes" integer NOT NULL DEFAULT 0,
  CONSTRAINT "project_daily_report_employees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pdre_minutes_check" CHECK ("expected_daily_workload_minutes" BETWEEN 1 AND 1440 AND "regular_worked_minutes" BETWEEN 0 AND 1440 AND "overtime_minutes" BETWEEN 0 AND 1440 AND "regular_worked_minutes" + "overtime_minutes" <= 1440),
  CONSTRAINT "pdre_full_shift_check" CHECK (NOT "completed_full_shift" OR "regular_worked_minutes" = "expected_daily_workload_minutes")
);
CREATE UNIQUE INDEX "project_daily_report_employees_report_employment_key" ON "project_daily_report_employees" ("daily_report_id", "employment_id");
CREATE INDEX "project_daily_report_employees_scope_idx" ON "project_daily_report_employees" ("corporation_id", "company_id", "project_id", "employment_id", "daily_report_id");

CREATE TABLE "project_daily_report_machines" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "daily_report_id" uuid NOT NULL,
  "machine_id" uuid NOT NULL,
  "machine_name_snapshot" varchar(160) NOT NULL,
  "manufacturer_snapshot" varchar(120) NOT NULL,
  "model_snapshot" varchar(120) NOT NULL,
  "meter_type_snapshot" "machine_meter_type" NOT NULL,
  "identifier_kind_snapshot" "machine_identifier_kind",
  "identifier_value_snapshot" varchar(80),
  "start_meter_reading_id" uuid NOT NULL,
  "start_meter_reading_value" numeric(14,2) NOT NULL,
  "end_meter_reading_id" uuid,
  "end_meter_reading_value" numeric(14,2) NOT NULL,
  CONSTRAINT "project_daily_report_machines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pdrm_reading_check" CHECK ("start_meter_reading_value" >= 0 AND "end_meter_reading_value" >= "start_meter_reading_value")
);
CREATE UNIQUE INDEX "project_daily_report_machines_report_machine_key" ON "project_daily_report_machines" ("daily_report_id", "machine_id");
CREATE INDEX "project_daily_report_machines_scope_idx" ON "project_daily_report_machines" ("corporation_id", "company_id", "project_id", "machine_id", "daily_report_id");

ALTER TABLE "project_daily_reports" ADD CONSTRAINT "pdr_project_fkey" FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects" ("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_daily_reports" ADD CONSTRAINT "pdr_supervisor_fkey" FOREIGN KEY ("corporation_id", "company_id", "supervisor_employment_id") REFERENCES "employments" ("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_daily_reports" ADD CONSTRAINT "pdr_created_by_fkey" FOREIGN KEY ("corporation_id", "created_by_user_id") REFERENCES "users" ("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_daily_reports" ADD CONSTRAINT "pdr_finalized_by_fkey" FOREIGN KEY ("corporation_id", "finalized_by_user_id") REFERENCES "users" ("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_daily_report_schedule_periods" ADD CONSTRAINT "pdrsp_report_fkey" FOREIGN KEY ("corporation_id", "company_id", "project_id", "daily_report_id") REFERENCES "project_daily_reports" ("corporation_id", "company_id", "project_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_daily_report_technical_responsibilities" ADD CONSTRAINT "pdrtr_report_fkey" FOREIGN KEY ("corporation_id", "company_id", "project_id", "daily_report_id") REFERENCES "project_daily_reports" ("corporation_id", "company_id", "project_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_daily_report_technical_responsibilities" ADD CONSTRAINT "pdrtr_employment_fkey" FOREIGN KEY ("corporation_id", "company_id", "employment_id") REFERENCES "employments" ("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_daily_report_employees" ADD CONSTRAINT "pdre_report_fkey" FOREIGN KEY ("corporation_id", "company_id", "project_id", "daily_report_id") REFERENCES "project_daily_reports" ("corporation_id", "company_id", "project_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_daily_report_employees" ADD CONSTRAINT "pdre_employment_fkey" FOREIGN KEY ("corporation_id", "company_id", "employment_id") REFERENCES "employments" ("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_daily_report_machines" ADD CONSTRAINT "pdrm_report_fkey" FOREIGN KEY ("corporation_id", "company_id", "project_id", "daily_report_id") REFERENCES "project_daily_reports" ("corporation_id", "company_id", "project_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_daily_report_machines" ADD CONSTRAINT "pdrm_machine_fkey" FOREIGN KEY ("corporation_id", "machine_id") REFERENCES "machines" ("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_daily_report_machines" ADD CONSTRAINT "pdrm_start_reading_fkey" FOREIGN KEY ("corporation_id", "company_id", "machine_id", "start_meter_reading_id") REFERENCES "machine_meter_readings" ("corporation_id", "company_id", "machine_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "project_daily_report_machines" ADD CONSTRAINT "pdrm_end_reading_fkey" FOREIGN KEY ("corporation_id", "company_id", "machine_id", "end_meter_reading_id") REFERENCES "machine_meter_readings" ("corporation_id", "company_id", "machine_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
