CREATE TYPE "project_work_front_employee_assignment_source" AS ENUM (
  'DIRECT',
  'MACHINE_OPERATOR',
  'BOTH'
);

ALTER TABLE "project_work_fronts"
  ADD COLUMN "requires_employees" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requires_machines" BOOLEAN NOT NULL DEFAULT true,
  ADD CONSTRAINT "pwf_resource_requirement_check"
    CHECK ("requires_employees" OR "requires_machines");

CREATE UNIQUE INDEX "pwf_scope_id_uq"
  ON "project_work_fronts"("corporation_id", "company_id", "project_id", "id");

ALTER TABLE "project_work_fronts"
  ADD CONSTRAINT "pwf_project_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "project_id")
    REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_machine_allocations"
  ADD COLUMN "created_by_user_id" UUID,
  ADD COLUMN "ended_by_user_id" UUID,
  ADD COLUMN "ended_reason" VARCHAR(500),
  ADD CONSTRAINT "pma_closed_audit_shape"
    CHECK (
      ("effective_to" IS NULL AND "ended_by_user_id" IS NULL AND "ended_reason" IS NULL)
      OR
      ("effective_to" IS NOT NULL AND "ended_by_user_id" IS NOT NULL AND "ended_reason" IS NOT NULL)
    ) NOT VALID;

ALTER TABLE "project_machine_allocations"
  ADD CONSTRAINT "pma_created_by_user_fkey"
    FOREIGN KEY ("corporation_id", "created_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pma_ended_by_user_fkey"
    FOREIGN KEY ("corporation_id", "ended_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "pma_created_by_user_idx"
  ON "project_machine_allocations"("corporation_id", "created_by_user_id");
CREATE INDEX "pma_ended_by_user_idx"
  ON "project_machine_allocations"("corporation_id", "ended_by_user_id");

CREATE TABLE "project_work_front_employee_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "work_front_id" UUID NOT NULL,
  "employment_id" UUID NOT NULL,
  "source" "project_work_front_employee_assignment_source" NOT NULL,
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_by_user_id" UUID NOT NULL,
  "ended_by_user_id" UUID,
  "ended_reason" VARCHAR(500),
  CONSTRAINT "project_work_front_employee_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pwfea_period_check"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "pwfea_closed_audit_shape"
    CHECK (
      ("effective_to" IS NULL AND "ended_by_user_id" IS NULL AND "ended_reason" IS NULL)
      OR
      ("effective_to" IS NOT NULL AND "ended_by_user_id" IS NOT NULL AND "ended_reason" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "pwfea_current_resource_key"
  ON "project_work_front_employee_assignments"
    ("corporation_id", "company_id", "project_id", "employment_id")
  WHERE "effective_to" IS NULL;
CREATE INDEX "pwfea_front_history_idx"
  ON "project_work_front_employee_assignments"
    ("corporation_id", "company_id", "project_id", "work_front_id", "effective_from");
CREATE INDEX "pwfea_employee_history_idx"
  ON "project_work_front_employee_assignments"
    ("corporation_id", "company_id", "project_id", "employment_id", "effective_from");

ALTER TABLE "project_work_front_employee_assignments"
  ADD CONSTRAINT "pwfea_project_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "project_id")
    REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pwfea_front_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "project_id", "work_front_id")
    REFERENCES "project_work_fronts"("corporation_id", "company_id", "project_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pwfea_employment_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "employment_id")
    REFERENCES "employments"("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pwfea_created_by_user_fkey"
    FOREIGN KEY ("corporation_id", "created_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pwfea_ended_by_user_fkey"
    FOREIGN KEY ("corporation_id", "ended_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "project_work_front_machine_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "work_front_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "operator_employment_id" UUID NOT NULL,
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_by_user_id" UUID NOT NULL,
  "ended_by_user_id" UUID,
  "ended_reason" VARCHAR(500),
  CONSTRAINT "project_work_front_machine_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pwfma_period_check"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "pwfma_closed_audit_shape"
    CHECK (
      ("effective_to" IS NULL AND "ended_by_user_id" IS NULL AND "ended_reason" IS NULL)
      OR
      ("effective_to" IS NOT NULL AND "ended_by_user_id" IS NOT NULL AND "ended_reason" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "pwfma_current_resource_key"
  ON "project_work_front_machine_assignments"
    ("corporation_id", "company_id", "project_id", "machine_id")
  WHERE "effective_to" IS NULL;
CREATE INDEX "pwfma_front_history_idx"
  ON "project_work_front_machine_assignments"
    ("corporation_id", "company_id", "project_id", "work_front_id", "effective_from");
CREATE INDEX "pwfma_machine_history_idx"
  ON "project_work_front_machine_assignments"
    ("corporation_id", "company_id", "project_id", "machine_id", "effective_from");

ALTER TABLE "project_work_front_machine_assignments"
  ADD CONSTRAINT "pwfma_project_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "project_id")
    REFERENCES "projects"("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pwfma_front_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "project_id", "work_front_id")
    REFERENCES "project_work_fronts"("corporation_id", "company_id", "project_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pwfma_machine_fkey"
    FOREIGN KEY ("corporation_id", "machine_id")
    REFERENCES "machines"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pwfma_operator_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "operator_employment_id")
    REFERENCES "employments"("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pwfma_created_by_user_fkey"
    FOREIGN KEY ("corporation_id", "created_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pwfma_ended_by_user_fkey"
    FOREIGN KEY ("corporation_id", "ended_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
