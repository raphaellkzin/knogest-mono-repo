CREATE TABLE "session_consumed_refresh_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL,
  "credential_hash" TEXT NOT NULL,
  "consumed_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "session_consumed_refresh_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "session_consumed_refresh_credentials_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "session_consumed_refresh_credentials_credential_hash_key"
  ON "session_consumed_refresh_credentials"("credential_hash");

CREATE INDEX "session_consumed_refresh_credentials_session_id_consumed_at_idx"
  ON "session_consumed_refresh_credentials"("session_id", "consumed_at");

INSERT INTO "session_consumed_refresh_credentials" (
  "session_id",
  "credential_hash",
  "consumed_at"
)
SELECT
  "id",
  "consumed_refresh_token_hash",
  COALESCE("refresh_consumed_at", "last_used_at")
FROM "sessions"
WHERE "consumed_refresh_token_hash" IS NOT NULL
ON CONFLICT ("credential_hash") DO NOTHING;

ALTER TABLE "sessions"
  DROP COLUMN "consumed_refresh_token_hash",
  DROP COLUMN "refresh_consumed_at";
