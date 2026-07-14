ALTER TABLE "project_machine_allocations"
  ADD COLUMN "operator_employment_id" uuid NOT NULL;

ALTER TABLE "project_machine_allocations"
  ADD CONSTRAINT "project_machine_allocations_operator_employment_fkey"
  FOREIGN KEY ("corporation_id", "company_id", "operator_employment_id")
  REFERENCES "employments"("corporation_id", "company_id", "id")
  ON DELETE RESTRICT;

CREATE INDEX "project_machine_allocations_operator_employment_idx"
  ON "project_machine_allocations" ("corporation_id", "company_id", "operator_employment_id");
