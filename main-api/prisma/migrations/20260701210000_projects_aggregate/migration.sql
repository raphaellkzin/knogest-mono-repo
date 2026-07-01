BEGIN;

CREATE TYPE "project_lifecycle_status" AS ENUM ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- Project relations include the complete trusted Company scope. The existing
-- global id remains unchanged; these candidate keys support composite FKs.
ALTER TABLE "clients"
  ADD CONSTRAINT "clients_corporation_id_company_id_id_key"
  UNIQUE ("corporation_id", "company_id", "id");
ALTER TABLE "fuel_suppliers"
  ADD CONSTRAINT "fuel_suppliers_corporation_id_company_id_id_key"
  UNIQUE ("corporation_id", "company_id", "id");

CREATE TABLE "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL,
  "name" varchar(160) NOT NULL, "address" varchar(500) NOT NULL, "latitude" numeric(9,6), "longitude" numeric(9,6),
  "contract_number" varchar(120), "normalized_contract_number" varchar(120), "status" project_lifecycle_status NOT NULL DEFAULT 'PLANNED',
  "actual_started_at" timestamptz(3), "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "projects_scope_key" UNIQUE ("corporation_id", "company_id", "id"),
  CONSTRAINT "projects_company_fkey" FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id") ON DELETE RESTRICT,
  CONSTRAINT "projects_coordinates_pair_check" CHECK ((latitude IS NULL) = (longitude IS NULL)),
  CONSTRAINT "projects_initial_state_check" CHECK (actual_started_at IS NULL OR status <> 'PLANNED')
);
CREATE INDEX "projects_scope_created_idx" ON "projects" ("corporation_id", "company_id", "created_at", "id");
CREATE INDEX "projects_scope_name_idx" ON "projects" ("corporation_id", "company_id", "name", "id");
CREATE INDEX "projects_contract_search_idx" ON "projects" ("corporation_id", "company_id", "normalized_contract_number");

CREATE TABLE "project_baselines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "project_id" uuid NOT NULL,
  "approved_budget" numeric(18,2) NOT NULL, "planned_start_date" date NOT NULL, "planned_end_date" date NOT NULL,
  "effective_from" timestamptz(3) NOT NULL, "effective_to" timestamptz(3), "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CHECK (approved_budget >= 0), CHECK (planned_end_date >= planned_start_date), CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX "project_baselines_current_key" ON "project_baselines" ("project_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_client_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "project_id" uuid NOT NULL, "client_id" uuid NOT NULL,
  "effective_from" timestamptz(3) NOT NULL, "effective_to" timestamptz(3),
  FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  FOREIGN KEY ("corporation_id", "company_id", "client_id") REFERENCES "clients"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX "project_client_periods_current_key" ON "project_client_periods" ("project_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_manager_tenures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "project_id" uuid NOT NULL, "employment_id" uuid NOT NULL,
  "effective_from" timestamptz(3) NOT NULL, "effective_to" timestamptz(3),
  FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  FOREIGN KEY ("corporation_id", "company_id", "employment_id") REFERENCES "employments"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX "project_manager_tenures_current_key" ON "project_manager_tenures" ("project_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_technical_responsibilities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "project_id" uuid NOT NULL, "employment_id" uuid NOT NULL,
  "effective_from" timestamptz(3) NOT NULL, "effective_to" timestamptz(3),
  FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  FOREIGN KEY ("corporation_id", "company_id", "employment_id") REFERENCES "employments"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX "project_technical_responsibilities_current_key" ON "project_technical_responsibilities" ("project_id", "employment_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_schedule_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "project_id" uuid NOT NULL,
  "effective_from" timestamptz(3) NOT NULL, "effective_to" timestamptz(3),
  CONSTRAINT "project_schedule_revisions_scope_key" UNIQUE ("corporation_id", "company_id", "id"),
  FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX "project_schedule_revisions_current_key" ON "project_schedule_revisions" ("project_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_schedule_days" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "schedule_revision_id" uuid NOT NULL,
  "day_of_week" integer NOT NULL, "is_working" boolean NOT NULL, "start_time" varchar(5), "end_time" varchar(5),
  UNIQUE ("schedule_revision_id", "day_of_week"),
  FOREIGN KEY ("corporation_id", "company_id", "schedule_revision_id") REFERENCES "project_schedule_revisions"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CHECK (day_of_week BETWEEN 1 AND 7),
  CHECK ((is_working AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time) OR (NOT is_working AND start_time IS NULL AND end_time IS NULL))
);

CREATE TABLE "project_break_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "schedule_revision_id" uuid NOT NULL,
  "position" integer NOT NULL, "name" varchar(120) NOT NULL, "duration_minutes" integer NOT NULL,
  UNIQUE ("schedule_revision_id", "position"),
  FOREIGN KEY ("corporation_id", "company_id", "schedule_revision_id") REFERENCES "project_schedule_revisions"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CHECK (duration_minutes BETWEEN 1 AND 1440)
);

CREATE TABLE "project_employee_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "project_id" uuid NOT NULL,
  "employment_id" uuid NOT NULL, "person_id" uuid NOT NULL, "job_role" varchar(120) NOT NULL, "expected_daily_workload_minutes" integer NOT NULL,
  "compensation_mode" varchar(16) NOT NULL, "compensation_value" numeric(18,2) NOT NULL, "overtime_rate" numeric(18,2) NOT NULL,
  "effective_from" timestamptz(3) NOT NULL, "effective_to" timestamptz(3),
  FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  FOREIGN KEY ("corporation_id", "company_id", "employment_id") REFERENCES "employments"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  FOREIGN KEY ("corporation_id", "person_id") REFERENCES "persons"("corporation_id", "id") ON DELETE RESTRICT,
  CHECK (expected_daily_workload_minutes BETWEEN 1 AND 1440), CHECK (compensation_value >= 0), CHECK (overtime_rate >= 0), CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX "project_employee_allocations_person_current_key" ON "project_employee_allocations" ("corporation_id", "person_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_machine_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "project_id" uuid NOT NULL,
  "machine_id" uuid NOT NULL, "start_meter_reading_id" uuid NOT NULL, "effective_from" timestamptz(3) NOT NULL, "effective_to" timestamptz(3),
  FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  FOREIGN KEY ("corporation_id", "company_id", "machine_id", "start_meter_reading_id") REFERENCES "machine_meter_readings"("corporation_id", "company_id", "machine_id", "id") ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX "project_machine_allocations_machine_current_key" ON "project_machine_allocations" ("corporation_id", "machine_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_fuel_agreements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "project_id" uuid NOT NULL, "fuel_supplier_id" uuid NOT NULL,
  "effective_from" timestamptz(3) NOT NULL, "effective_to" timestamptz(3),
  CONSTRAINT "project_fuel_agreements_scope_key" UNIQUE ("corporation_id", "company_id", "id"),
  FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  FOREIGN KEY ("corporation_id", "company_id", "fuel_supplier_id") REFERENCES "fuel_suppliers"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX "project_fuel_agreements_current_key" ON "project_fuel_agreements" ("project_id", "fuel_supplier_id") WHERE "effective_to" IS NULL;

CREATE TABLE "project_fuel_prices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL, "agreement_id" uuid NOT NULL,
  "fuel_type_id" varchar(32) NOT NULL, "price_per_liter" numeric(18,4) NOT NULL, "effective_from" timestamptz(3) NOT NULL, "effective_to" timestamptz(3),
  FOREIGN KEY ("corporation_id", "company_id", "agreement_id") REFERENCES "project_fuel_agreements"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  FOREIGN KEY ("fuel_type_id") REFERENCES "fuel_types"("id") ON DELETE RESTRICT,
  CHECK (price_per_liter > 0), CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE UNIQUE INDEX "project_fuel_prices_current_key" ON "project_fuel_prices" ("agreement_id", "fuel_type_id") WHERE "effective_to" IS NULL;

CREATE TABLE "idempotency_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "session_id" uuid NOT NULL, "corporation_id" uuid NOT NULL, "company_id" uuid NOT NULL,
  "operation" varchar(80) NOT NULL, "key" uuid NOT NULL, "request_hash" varchar(64) NOT NULL, "project_id" uuid NOT NULL,
  "completed_at" timestamptz(3) NOT NULL, "expires_at" timestamptz(3) NOT NULL,
  UNIQUE ("session_id", "corporation_id", "company_id", "operation", "key"),
  FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT,
  FOREIGN KEY ("corporation_id", "company_id", "project_id") REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT,
  CHECK (request_hash ~ '^[a-f0-9]{64}$'), CHECK (expires_at > completed_at)
);
CREATE INDEX "idempotency_records_expires_idx" ON "idempotency_records" ("expires_at");

CREATE FUNCTION enforce_project_required_children() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM project_baselines WHERE project_id = NEW.id AND effective_to IS NULL)
     OR NOT EXISTS (SELECT 1 FROM project_client_periods WHERE project_id = NEW.id AND effective_to IS NULL)
     OR NOT EXISTS (SELECT 1 FROM project_manager_tenures WHERE project_id = NEW.id AND effective_to IS NULL)
     OR NOT EXISTS (SELECT 1 FROM project_technical_responsibilities WHERE project_id = NEW.id AND effective_to IS NULL)
     OR NOT EXISTS (SELECT 1 FROM project_schedule_revisions r WHERE r.project_id = NEW.id AND r.effective_to IS NULL AND (SELECT count(*) FROM project_schedule_days d WHERE d.schedule_revision_id = r.id) = 7)
  THEN RAISE EXCEPTION 'project aggregate is incomplete' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "projects_required_children_trigger" AFTER INSERT OR UPDATE ON "projects" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_project_required_children();

CREATE FUNCTION enforce_fuel_agreement_children() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM project_fuel_prices WHERE agreement_id = NEW.id AND effective_to IS NULL)
  THEN RAISE EXCEPTION 'fuel agreement requires a price' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "fuel_agreement_children_trigger" AFTER INSERT OR UPDATE ON "project_fuel_agreements" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION enforce_fuel_agreement_children();

COMMIT;
