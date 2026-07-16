BEGIN;

CREATE TABLE "project_production_metric_targets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "corporation_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "metric_code" varchar(32) NOT NULL,
  "target_total" numeric(18,2) NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_metric_targets_project_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "project_id")
    REFERENCES "projects"("corporation_id", "company_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "project_metric_targets_code_check"
    CHECK ("metric_code" IN ('cut', 'fill', 'finishing', 'top_soil')),
  CONSTRAINT "project_metric_targets_total_check"
    CHECK ("target_total" > 0)
);
CREATE UNIQUE INDEX "project_metric_targets_current_key"
  ON "project_production_metric_targets" ("corporation_id", "company_id", "project_id", "metric_code");
CREATE INDEX "project_metric_targets_project_idx"
  ON "project_production_metric_targets" ("corporation_id", "company_id", "project_id");

CREATE TABLE "project_compensation_payment_terms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "corporation_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "compensation_mode" varchar(16) NOT NULL,
  "days_after_period_end" integer NOT NULL,
  "created_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_payment_terms_project_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "project_id")
    REFERENCES "projects"("corporation_id", "company_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "project_payment_terms_mode_check"
    CHECK ("compensation_mode" IN ('daily', 'hourly', 'weekly', 'fortnightly', 'monthly')),
  CONSTRAINT "project_payment_terms_days_check"
    CHECK ("days_after_period_end" BETWEEN 0 AND 60)
);
CREATE UNIQUE INDEX "project_payment_terms_current_key"
  ON "project_compensation_payment_terms" ("corporation_id", "company_id", "project_id", "compensation_mode");
CREATE INDEX "project_payment_terms_project_idx"
  ON "project_compensation_payment_terms" ("corporation_id", "company_id", "project_id");

CREATE TABLE "project_lifecycle_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "corporation_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "from_status" project_lifecycle_status NOT NULL,
  "to_status" project_lifecycle_status NOT NULL,
  "occurred_at" timestamptz(3) NOT NULL,
  "actor_user_id" uuid NOT NULL,
  "reason" varchar(500),
  CONSTRAINT "project_lifecycle_events_project_fkey"
    FOREIGN KEY ("corporation_id", "company_id", "project_id")
    REFERENCES "projects"("corporation_id", "company_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "project_lifecycle_events_actor_fkey"
    FOREIGN KEY ("corporation_id", "actor_user_id")
    REFERENCES "users"("corporation_id", "id")
    ON DELETE RESTRICT,
  CONSTRAINT "project_lifecycle_events_transition_check"
    CHECK ("from_status" <> "to_status")
);
CREATE INDEX "project_lifecycle_events_project_idx"
  ON "project_lifecycle_events" ("corporation_id", "company_id", "project_id", "occurred_at", "id");

COMMIT;
