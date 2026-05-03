-- Пересборка индекса возможна только после CREATE TABLE LobbyMessage (20260504162000_*).
-- Раньше DROP INDEX падал на shadow-базе — индекса ещё нет.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND (c.relname = 'LobbyMessage' OR lower(c.relname) = lower('LobbyMessage'))
  ) THEN
    DROP INDEX IF EXISTS "LobbyMessage_createdAt_idx";
    CREATE INDEX IF NOT EXISTS "LobbyMessage_createdAt_idx" ON "LobbyMessage"("createdAt");
  END IF;
END $$;
