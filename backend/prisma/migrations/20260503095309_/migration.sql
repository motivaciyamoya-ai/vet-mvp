-- DirectConversation появится в следующей по порядку миграции 20260504120000_* (CREATE с updatedAt без DEFAULT).
-- Для уже существующих БД после CREATE держался DEFAULT CURRENT_TIMESTAMP → убираем.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN ('DirectConversation', 'directconversation')
  ) THEN
    ALTER TABLE "DirectConversation" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;
