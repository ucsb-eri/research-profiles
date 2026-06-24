-- transfer_ownership_to_prod.sql
--
-- Gives the production app role the two things it needs to run DDL migrations:
--   1. ownership of every table/sequence in the public schema, and
--   2. CREATE on the public schema itself.
--
-- WHY: migrations run DDL (ALTER TABLE, CREATE INDEX). Postgres only lets the
-- table *owner* alter a table ("must be owner of table faculty", 42501), and
-- since PG15 the public schema no longer grants CREATE by default, so making an
-- index also needs CREATE on the schema ("permission denied for schema public").
-- The prod role has DML grants but neither of these, so migrations fail. This
-- fixes both, now and for future migrations.
--
-- HOW TO RUN (once, as a SUPERUSER such as `postgres`, against the prod DB):
--   sudo -u postgres psql -d production -f transfer_ownership_to_prod.sql
-- (Use the actual database name from DATABASE_URL in place of `production`.)

\echo 'Granting CREATE on schema public + transferring table ownership to the app role ...'

-- Lets prod create indexes / new tables in the schema (needed since PG15).
GRANT USAGE, CREATE ON SCHEMA public TO prod;

DO $$
DECLARE
  target text := 'prod';   -- change if the app role is not named "prod"
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO %I', r.tablename, target);
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO %I', r.sequencename, target);
  END LOOP;
END $$;

\echo 'Done. Re-run `npm run migrate` (as prod) — DDL migrations will now succeed.'
