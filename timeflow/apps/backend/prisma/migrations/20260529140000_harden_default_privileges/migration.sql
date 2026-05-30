-- Belt-and-suspenders: ensure Prisma-created tables never grant PostgREST access.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

-- Supabase internal role may still grant API access on objects it creates.
DO $$
BEGIN
  EXECUTE $sql$
    ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
      REVOKE ALL ON TABLES FROM anon, authenticated
  $sql$;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped supabase_admin default privilege hardening (requires superuser)';
END $$;
