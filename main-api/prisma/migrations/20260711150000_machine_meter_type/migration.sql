CREATE TYPE "machine_meter_type" AS ENUM ('HOUR_METER', 'ODOMETER');

ALTER TABLE "machines"
ADD COLUMN "meter_type" "machine_meter_type" NOT NULL DEFAULT 'HOUR_METER';

ALTER TABLE "machines"
ALTER COLUMN "meter_type" DROP DEFAULT;
