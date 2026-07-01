CREATE OR REPLACE FUNCTION prevent_closed_employment_period_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD."effective_to" IS NOT NULL THEN
    RAISE EXCEPTION 'closed employment periods are immutable'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER employment_periods_prevent_closed_update
BEFORE UPDATE ON "employment_periods"
FOR EACH ROW
EXECUTE FUNCTION prevent_closed_employment_period_mutation();

CREATE TRIGGER employment_periods_prevent_closed_delete
BEFORE DELETE ON "employment_periods"
FOR EACH ROW
EXECUTE FUNCTION prevent_closed_employment_period_mutation();
