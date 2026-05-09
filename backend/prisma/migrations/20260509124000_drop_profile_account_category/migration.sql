-- Drop column and enum introduced earlier (category moved into JobTitle/specialization).
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "accountCategory";

DO $$ BEGIN
  DROP TYPE IF EXISTS "AccountCategory";
EXCEPTION
  WHEN dependent_objects_still_exist THEN
    -- If some other object references the type (shouldn't), keep it.
    NULL;
END $$;

