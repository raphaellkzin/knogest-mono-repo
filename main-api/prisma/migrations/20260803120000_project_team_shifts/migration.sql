ALTER TABLE "project_schedule_days"
  ADD COLUMN "shift" "project_daily_report_shift" NOT NULL DEFAULT 'DAY',
  ADD COLUMN "end_day_offset" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "project_schedule_days_end_day_offset_check"
    CHECK ("end_day_offset" BETWEEN 0 AND 1);

DO $$
DECLARE existing_constraint text;
BEGIN
  SELECT c.conname
    INTO existing_constraint
    FROM pg_constraint c
   WHERE c.conrelid = 'project_schedule_days'::regclass
     AND c.contype = 'c'
     AND pg_get_constraintdef(c.oid) LIKE '%start_time%';
  IF existing_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE project_schedule_days DROP CONSTRAINT %I',
      existing_constraint
    );
  END IF;
END $$;

ALTER TABLE "project_schedule_days"
  ADD CONSTRAINT "project_schedule_days_window_check"
    CHECK (
      (
        "is_working"
        AND "start_time" IS NOT NULL
        AND "end_time" IS NOT NULL
        AND (
          ("end_day_offset" = 0 AND "start_time" < "end_time")
          OR "end_day_offset" = 1
        )
      )
      OR (
        NOT "is_working"
        AND "start_time" IS NULL
        AND "end_time" IS NULL
        AND "end_day_offset" = 0
      )
    );

DO $$
DECLARE existing_constraint text;
BEGIN
  SELECT c.conname
    INTO existing_constraint
    FROM pg_constraint c
   WHERE c.conrelid = 'project_schedule_days'::regclass
     AND c.contype = 'u';
  IF existing_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE project_schedule_days DROP CONSTRAINT %I',
      existing_constraint
    );
  END IF;
END $$;
CREATE UNIQUE INDEX "project_schedule_days_schedule_revision_id_shift_day_of_week_key"
  ON "project_schedule_days"("schedule_revision_id", "shift", "day_of_week");

ALTER TABLE "project_break_templates"
  ADD COLUMN "shift" "project_daily_report_shift" NOT NULL DEFAULT 'DAY';

DO $$
DECLARE existing_constraint text;
BEGIN
  SELECT c.conname
    INTO existing_constraint
    FROM pg_constraint c
   WHERE c.conrelid = 'project_break_templates'::regclass
     AND c.contype = 'u';
  IF existing_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE project_break_templates DROP CONSTRAINT %I',
      existing_constraint
    );
  END IF;
END $$;
CREATE UNIQUE INDEX "project_break_templates_schedule_revision_id_shift_position_key"
  ON "project_break_templates"("schedule_revision_id", "shift", "position");

ALTER TABLE "project_employee_allocations"
  ADD COLUMN "shift" "project_daily_report_shift" NOT NULL DEFAULT 'DAY';

ALTER TABLE "project_work_front_employee_assignments"
  ADD COLUMN "shift" "project_daily_report_shift" NOT NULL DEFAULT 'DAY';

ALTER TABLE "project_work_front_machine_assignments"
  ADD COLUMN "shift" "project_daily_report_shift" NOT NULL DEFAULT 'DAY';

DROP INDEX "pwfma_current_resource_key";
CREATE UNIQUE INDEX "pwfma_current_resource_shift_key"
  ON "project_work_front_machine_assignments"
    ("corporation_id", "company_id", "project_id", "machine_id", "shift")
  WHERE "effective_to" IS NULL;

CREATE TABLE "project_machine_shift_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "project_machine_allocation_id" UUID NOT NULL,
  "machine_id" UUID NOT NULL,
  "shift" "project_daily_report_shift" NOT NULL,
  "operator_employment_id" UUID NOT NULL,
  "effective_from" TIMESTAMPTZ(3) NOT NULL,
  "effective_to" TIMESTAMPTZ(3),
  "created_by_user_id" UUID,
  "ended_by_user_id" UUID,
  "ended_reason" VARCHAR(500),
  CONSTRAINT "project_machine_shift_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pmsa_period_check"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "pmsa_closed_audit_shape"
    CHECK (
      ("effective_to" IS NULL AND "ended_by_user_id" IS NULL AND "ended_reason" IS NULL)
      OR
      ("effective_to" IS NOT NULL AND "ended_by_user_id" IS NOT NULL AND "ended_reason" IS NOT NULL)
    )
);

INSERT INTO "project_machine_shift_assignments" (
  "corporation_id",
  "company_id",
  "project_id",
  "project_machine_allocation_id",
  "machine_id",
  "shift",
  "operator_employment_id",
  "effective_from",
  "effective_to",
  "created_by_user_id",
  "ended_by_user_id",
  "ended_reason"
)
SELECT
  "corporation_id",
  "company_id",
  "project_id",
  "id",
  "machine_id",
  'DAY'::"project_daily_report_shift",
  "operator_employment_id",
  "effective_from",
  "effective_to",
  "created_by_user_id",
  "ended_by_user_id",
  "ended_reason"
FROM "project_machine_allocations";

CREATE UNIQUE INDEX "pmsa_current_machine_shift_key"
  ON "project_machine_shift_assignments"
    ("corporation_id", "company_id", "project_id", "machine_id", "shift")
  WHERE "effective_to" IS NULL;
CREATE UNIQUE INDEX "pmsa_current_operator_key"
  ON "project_machine_shift_assignments"
    ("corporation_id", "company_id", "project_id", "operator_employment_id")
  WHERE "effective_to" IS NULL;
CREATE INDEX "pmsa_allocation_idx"
  ON "project_machine_shift_assignments"("project_machine_allocation_id");
CREATE INDEX "pmsa_operator_history_idx"
  ON "project_machine_shift_assignments"
    ("corporation_id", "company_id", "project_id", "operator_employment_id", "effective_from");

ALTER TABLE "project_machine_shift_assignments"
  ADD CONSTRAINT "pmsa_allocation_fkey"
    FOREIGN KEY ("project_machine_allocation_id")
    REFERENCES "project_machine_allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "pmsa_operator_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "operator_employment_id")
    REFERENCES "employments"("corporation_id", "company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pmsa_created_by_user_fkey"
    FOREIGN KEY ("corporation_id", "created_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "pmsa_ended_by_user_fkey"
    FOREIGN KEY ("corporation_id", "ended_by_user_id")
    REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_project_required_children()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM project_baselines WHERE project_id = NEW.id AND effective_to IS NULL)
     OR NOT EXISTS (SELECT 1 FROM project_client_periods WHERE project_id = NEW.id AND effective_to IS NULL)
     OR NOT EXISTS (SELECT 1 FROM project_manager_tenures WHERE project_id = NEW.id AND effective_to IS NULL)
     OR NOT EXISTS (SELECT 1 FROM project_technical_responsibilities WHERE project_id = NEW.id AND effective_to IS NULL)
     OR NOT EXISTS (
       SELECT 1
       FROM project_schedule_revisions r
       WHERE r.project_id = NEW.id
         AND r.effective_to IS NULL
         AND (SELECT count(*) FROM project_schedule_days d WHERE d.schedule_revision_id = r.id AND d.shift = 'DAY') = 7
         AND (SELECT count(*) FROM project_schedule_days d WHERE d.schedule_revision_id = r.id) IN (7, 14)
     )
  THEN
    RAISE EXCEPTION 'project aggregate is incomplete' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
