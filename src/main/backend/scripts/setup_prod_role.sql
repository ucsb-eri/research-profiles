-- setup_prod_role.sql
--
-- Creates a proper production database role for the research-profiles API and
-- gives it the privileges the app + migrations need:
--   * full DML (SELECT/INSERT/UPDATE/DELETE) on all tables
--   * sequence usage (for the SERIAL faculty.id)
--   * ownership of the existing objects, so migrations can ALTER them and so
--     the trusted pg_trgm extension can be (re)created
--
-- WHY: the current DATABASE_URL role is an old employee's account that only has
-- read access and does not own the tables, which is why edits fail with
-- "permission denied for table faculty (42501)".
--
-- HOW TO RUN (once, as a SUPERUSER such as `postgres`, connected to the prod DB):
--   sudo -u postgres psql -d research_profiles -f setup_prod_role.sql
-- or:
--   psql "postgres://postgres@/research_profiles" -f setup_prod_role.sql
--
-- 1) EDIT these four values before running:
\set app_role        research_profiles_app
\set app_password    'CHANGE_ME_TO_A_STRONG_PASSWORD'
\set old_role        old_employee_role
\set db_name         research_profiles

\echo 'Setting up production role :app_role on database :db_name ...'

-- 2) Create the login role (skip the CREATE if it already exists; the ALTER
--    below always (re)sets the password and ensures it can log in).
SELECT 'CREATE ROLE ' || quote_ident(:'app_role') || ' LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_role')
\gexec
ALTER ROLE :app_role WITH LOGIN PASSWORD :'app_password';

-- 3) Let the role connect, use the schema, and create objects (needed for
--    migrations: new tables, schema_migrations, and the trusted pg_trgm ext).
GRANT CONNECT ON DATABASE :db_name TO :app_role;
GRANT CREATE ON DATABASE :db_name TO :app_role;   -- allows installing the trusted pg_trgm extension
GRANT USAGE, CREATE ON SCHEMA public TO :app_role;

-- 4) Transfer ownership of everything the old employee's role owns in this
--    database to the new role, so it can ALTER tables (migrations) and run DML.
--    Requires superuser (or membership in both roles).
REASSIGN OWNED BY :old_role TO :app_role;

-- 5) Belt-and-suspenders: grant DML on any current objects not now owned by the
--    role, plus future objects, so nothing is left read-only.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO :app_role;
GRANT USAGE, SELECT, UPDATE        ON ALL SEQUENCES IN SCHEMA public TO :app_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO :app_role;

\echo 'Done. Now point the production DATABASE_URL at :app_role and redeploy.'
