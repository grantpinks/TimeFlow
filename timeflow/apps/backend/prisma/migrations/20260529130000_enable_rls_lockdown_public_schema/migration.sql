-- Lock down public schema for Supabase PostgREST exposure.
-- TimeFlow reads/writes data only through Prisma (postgres role, bypasses RLS).
-- The publishable Supabase key must not grant direct table access to anon/authenticated.

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT quote_ident(schemaname) AS schema_name, quote_ident(tablename) AS table_name
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE %s.%s ENABLE ROW LEVEL SECURITY',
      tbl.schema_name,
      tbl.table_name
    );
    EXECUTE format(
      'REVOKE ALL ON TABLE %s.%s FROM anon, authenticated',
      tbl.schema_name,
      tbl.table_name
    );
  END LOOP;
END $$;

-- New Prisma tables should not inherit PostgREST access by default.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
