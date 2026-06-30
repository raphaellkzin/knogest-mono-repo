CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE "User";

CREATE TYPE "user_role" AS ENUM ('MASTER_ADMIN');

CREATE TABLE "corporations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(160) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "corporations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "domains" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corporation_id" UUID NOT NULL,
    "host" VARCHAR(253) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corporation_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corporation_id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'MASTER_ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "corporation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID,
    "refresh_token_hash" TEXT,
    "refresh_version" INTEGER NOT NULL DEFAULT 0,
    "refresh_consumed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idle_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "absolute_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revocation_reason" VARCHAR(120),
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "domains_host_key" ON "domains"("host");
CREATE INDEX "domains_corporation_id_idx" ON "domains"("corporation_id");
CREATE UNIQUE INDEX "companies_corporation_id_id_key" ON "companies"("corporation_id", "id");
CREATE UNIQUE INDEX "companies_corporation_id_name_key" ON "companies"("corporation_id", "name");
CREATE UNIQUE INDEX "users_corporation_id_id_key" ON "users"("corporation_id", "id");
CREATE UNIQUE INDEX "users_corporation_id_email_key" ON "users"("corporation_id", "email");
CREATE INDEX "sessions_corporation_id_user_id_idx" ON "sessions"("corporation_id", "user_id");
CREATE INDEX "sessions_corporation_id_company_id_idx" ON "sessions"("corporation_id", "company_id");

ALTER TABLE "domains" ADD CONSTRAINT "domains_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_corporation_id_fkey" FOREIGN KEY ("corporation_id") REFERENCES "corporations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_corporation_id_user_id_fkey" FOREIGN KEY ("corporation_id", "user_id") REFERENCES "users"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_corporation_id_company_id_fkey" FOREIGN KEY ("corporation_id", "company_id") REFERENCES "companies"("corporation_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
