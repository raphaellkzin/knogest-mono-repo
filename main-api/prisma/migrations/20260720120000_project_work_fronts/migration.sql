CREATE TYPE "project_work_front_status" AS ENUM ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "project_quantity_baseline_revisions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL,
  "reason" VARCHAR(240),
  "created_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_quantity_baseline_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pqbr_project_revision_uq"
  ON "project_quantity_baseline_revisions"("corporation_id", "company_id", "project_id", "revision");
CREATE INDEX "pqbr_project_created_idx"
  ON "project_quantity_baseline_revisions"("corporation_id", "company_id", "project_id", "created_at");

CREATE TABLE "project_quantity_baseline_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "revision_id" UUID NOT NULL,
  "service_code" VARCHAR(48) NOT NULL,
  "unit_code" VARCHAR(32) NOT NULL,
  "total" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "project_quantity_baseline_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pqbi_revision_service_uq"
  ON "project_quantity_baseline_items"("revision_id", "service_code");
CREATE INDEX "project_quantity_baseline_items_revision_id_idx" ON "project_quantity_baseline_items"("revision_id");

CREATE TABLE "project_work_fronts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "location" VARCHAR(240),
  "notes" VARCHAR(1000),
  "planned_start_date" DATE,
  "planned_end_date" DATE,
  "status" "project_work_front_status" NOT NULL DEFAULT 'PLANNED',
  "actual_started_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "project_work_fronts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pwf_project_name_uq"
  ON "project_work_fronts"("corporation_id", "company_id", "project_id", "name");
CREATE INDEX "pwf_project_status_idx"
  ON "project_work_fronts"("corporation_id", "company_id", "project_id", "status");

CREATE TABLE "project_work_front_services" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "work_front_id" UUID NOT NULL,
  "service_code" VARCHAR(48) NOT NULL,
  "unit_code" VARCHAR(32) NOT NULL,
  "quantity" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "project_work_front_services_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pwfs_front_service_uq"
  ON "project_work_front_services"("work_front_id", "service_code");
CREATE INDEX "pwfs_project_front_idx"
  ON "project_work_front_services"("corporation_id", "company_id", "project_id", "work_front_id");

CREATE TABLE "project_work_front_lifecycle_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "corporation_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "project_id" UUID NOT NULL,
  "work_front_id" UUID NOT NULL,
  "from_status" "project_work_front_status" NOT NULL,
  "to_status" "project_work_front_status" NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "actor_user_id" UUID NOT NULL,
  "reason" VARCHAR(500),
  CONSTRAINT "project_work_front_lifecycle_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pwfle_project_front_date_idx"
  ON "project_work_front_lifecycle_events"("corporation_id", "company_id", "project_id", "work_front_id", "occurred_at");

WITH first_actor AS (
  SELECT p."id" AS project_id, p."corporation_id", p."company_id",
    COALESCE((ARRAY_AGG(e."actor_user_id" ORDER BY e."actor_user_id"))[1], (
      SELECT u."id" FROM "users" u WHERE u."corporation_id" = p."corporation_id" ORDER BY u."id" LIMIT 1
    )) AS actor_user_id
  FROM "projects" p
  JOIN "project_production_metric_targets" m ON m."project_id" = p."id"
  LEFT JOIN "project_lifecycle_events" e ON e."project_id" = p."id"
  GROUP BY p."id", p."corporation_id", p."company_id"
), revisions AS (
  INSERT INTO "project_quantity_baseline_revisions" ("corporation_id", "company_id", "project_id", "revision", "reason", "created_by_user_id")
  SELECT "corporation_id", "company_id", project_id, 1, 'Migração das metas legadas', actor_user_id
  FROM first_actor WHERE actor_user_id IS NOT NULL
  RETURNING "id", "project_id"
)
INSERT INTO "project_quantity_baseline_items" ("revision_id", "service_code", "unit_code", "total")
SELECT r."id", m."metric_code",
  CASE m."metric_code" WHEN 'finishing' THEN 'M2' WHEN 'top_soil' THEN 'M3_KM' ELSE 'M3' END,
  m."target_total"
FROM revisions r
JOIN "project_production_metric_targets" m ON m."project_id" = r."project_id";
