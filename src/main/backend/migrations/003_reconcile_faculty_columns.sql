-- 003_reconcile_faculty_columns.sql
-- Bring databases whose tables predate the migrations fully up to spec. The
-- CREATE TABLE IF NOT EXISTS in 001 is a no-op on a pre-existing table, so any
-- column added to the app over time may be missing in such a database (this is
-- what broke profile editing on production). Every statement is a no-op where
-- the column already exists, so this is safe on fresh databases too.

ALTER TABLE faculty ADD COLUMN IF NOT EXISTS title          TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS email          TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS phone          TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS office         TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS website        TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS photo_url      TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS research_areas TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS department     TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS profile_url    TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS topics         TEXT;

ALTER TABLE faculty_summaries ADD COLUMN IF NOT EXISTS summary        TEXT;
ALTER TABLE faculty_summaries ADD COLUMN IF NOT EXISTS keywords       TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE faculty_summaries ADD COLUMN IF NOT EXISTS broad_keywords TEXT[] NOT NULL DEFAULT '{}';

-- Keep email's UNIQUE guarantee (insertFaculty relies on ON CONFLICT (email)).
-- Only added if some equivalent unique index/constraint doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid = 'faculty'::regclass AND contype = 'u'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'faculty' AND indexdef ILIKE '%UNIQUE%(email)%'
  ) THEN
    ALTER TABLE faculty ADD CONSTRAINT faculty_email_key UNIQUE (email);
  END IF;
END $$;
