ALTER TABLE "project_employee_allocations"
  ADD COLUMN "created_by_user_id" uuid,
  ADD COLUMN "ended_by_user_id" uuid,
  ADD COLUMN "ended_reason" varchar(500);

ALTER TABLE "project_employee_allocations"
  ADD CONSTRAINT "project_employee_allocations_created_by_user_id_fkey"
    FOREIGN KEY ("corporation_id", "created_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "project_employee_allocations_ended_by_user_id_fkey"
    FOREIGN KEY ("corporation_id", "ended_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "project_employee_allocations_closed_audit_shape"
    CHECK (
      ("effective_to" IS NULL AND "ended_by_user_id" IS NULL AND "ended_reason" IS NULL)
      OR
      ("effective_to" IS NOT NULL AND "ended_by_user_id" IS NOT NULL AND "ended_reason" IS NOT NULL)
    );

CREATE INDEX "project_employee_allocations_created_by_user_id_idx"
  ON "project_employee_allocations"("corporation_id", "created_by_user_id");
CREATE INDEX "project_employee_allocations_ended_by_user_id_idx"
  ON "project_employee_allocations"("corporation_id", "ended_by_user_id");
