CREATE TABLE "job_roles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "normalized_name" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "job_roles_corporation_id_company_id_normalized_name_key" UNIQUE ("corporation_id", "company_id", "normalized_name"),
  CONSTRAINT "job_roles_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "job_roles_corporation_id_company_id_fkey" FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "job_roles_corporation_id_company_id_is_active_name_id_idx" ON "job_roles"("corporation_id", "company_id", "is_active", "name", "id");

CREATE TABLE "employment_job_role_periods" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "employment_id" UUID NOT NULL,
  "job_role_id" UUID NOT NULL,
  "reason" VARCHAR(240),
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "employment_job_role_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employment_job_role_periods_employment_fkey" FOREIGN KEY ("corporation_id", "company_id", "employment_id") REFERENCES "employments"("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employment_job_role_periods_job_role_id_fkey" FOREIGN KEY ("job_role_id") REFERENCES "job_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "employment_job_role_periods_corporation_id_company_id_employment_id_effective_from_id_idx" ON "employment_job_role_periods"("corporation_id", "company_id", "employment_id", "effective_from", "id");
CREATE UNIQUE INDEX "employment_job_role_periods_open_period_unique" ON "employment_job_role_periods"("corporation_id", "company_id", "employment_id") WHERE "effective_to" IS NULL;

ALTER TABLE "project_employee_allocations" ADD COLUMN "employment_job_role_period_id" UUID;
ALTER TABLE "project_employee_allocations" ADD CONSTRAINT "project_employee_allocations_employment_job_role_period_id_fkey" FOREIGN KEY ("employment_job_role_period_id") REFERENCES "employment_job_role_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "project_employee_allocations_employment_job_role_period_id_idx" ON "project_employee_allocations"("employment_job_role_period_id");
