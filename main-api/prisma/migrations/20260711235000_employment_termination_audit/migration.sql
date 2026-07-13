ALTER TABLE "employment_periods"
  ADD COLUMN "ended_by_user_id" UUID;

ALTER TABLE "employment_job_role_periods"
  ADD COLUMN "ended_by_user_id" UUID,
  ADD COLUMN "ended_reason" VARCHAR(240);

ALTER TABLE "project_technical_responsibilities"
  ADD COLUMN "ended_by_user_id" UUID,
  ADD COLUMN "ended_reason" VARCHAR(240);

ALTER TABLE "employment_periods"
  ADD CONSTRAINT "employment_periods_ended_by_user_id_fkey"
  FOREIGN KEY ("corporation_id", "ended_by_user_id")
  REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employment_job_role_periods"
  ADD CONSTRAINT "employment_job_role_periods_ended_by_user_id_fkey"
  FOREIGN KEY ("corporation_id", "ended_by_user_id")
  REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_technical_responsibilities"
  ADD CONSTRAINT "project_technical_responsibilities_ended_by_user_id_fkey"
  FOREIGN KEY ("corporation_id", "ended_by_user_id")
  REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "employment_periods_ended_by_user_id_idx"
  ON "employment_periods"("ended_by_user_id");
CREATE INDEX "employment_job_role_periods_ended_by_user_id_idx"
  ON "employment_job_role_periods"("ended_by_user_id");
CREATE INDEX "project_technical_responsibilities_ended_by_user_id_idx"
  ON "project_technical_responsibilities"("ended_by_user_id");
