-- 004_faculty_null_email_dedupe_guard.sql
-- Stop duplicate faculty from accumulating on every scrape run.
--
-- insertFaculty() dedupes on email via ON CONFLICT, but most scraped faculty
-- have NO email, and Postgres treats every NULL as distinct — so re-running the
-- loader re-inserts those people each time. This migration:
--   1. removes existing null-email duplicates (same name + department), keeping
--      the richest row, so the unique index below can be built; then
--   2. adds a partial unique index that prevents future null-email duplicates at
--      write time. insertFaculty()'s ON CONFLICT DO NOTHING relies on it.
--
-- Rows WITH an email are already guarded by faculty_email_key, and the same name
-- in a DIFFERENT department stays distinct (legitimate cross-listing).

-- 1) Drop existing null-email (name, department) duplicates. Keep the row that
--    has a summary/research-links (enriched/owner-edited), then the most-complete
--    row, then the lowest id. Dependent rows cascade via ON DELETE CASCADE.
-- Normalization for the dedup key: lowercase, trim ends, and collapse internal
-- whitespace so "Jane  Doe" and "Jane Doe" are treated as the same person. The
-- same expression is used in the index below and in insertFaculty().
WITH ranked AS (
  SELECT
    f.id,
    lower(regexp_replace(btrim(f.name), '\s+', ' ', 'g')) || '|'
      || lower(regexp_replace(btrim(coalesce(f.department, '')), '\s+', ' ', 'g')) AS k,
    ( (f.title IS NOT NULL)::int + (f.specialization IS NOT NULL)::int
    + (f.phone IS NOT NULL)::int + (f.office IS NOT NULL)::int
    + (f.website IS NOT NULL)::int + (f.photo_url IS NOT NULL)::int
    + (f.research_areas IS NOT NULL)::int + (f.department IS NOT NULL)::int
    + (f.profile_url IS NOT NULL)::int ) AS filled,
    ( EXISTS (SELECT 1 FROM faculty_summaries s WHERE s.faculty_id = f.id)
      OR EXISTS (SELECT 1 FROM faculty_research_links l WHERE l.faculty_id = f.id) )::int AS has_deps
  FROM faculty f
  WHERE f.email IS NULL
),
numbered AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY k
      ORDER BY has_deps DESC, filled DESC, id ASC
    ) AS rn
  FROM ranked
)
DELETE FROM faculty
WHERE id IN (SELECT id FROM numbered WHERE rn > 1);

-- 2) Prevent future null-email duplicates: one row per (name, department) among
--    rows with no email. Expressions match insertFaculty()'s existing-row lookup.
CREATE UNIQUE INDEX IF NOT EXISTS faculty_null_email_name_dept_uniq
  ON faculty (
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g')),
    lower(regexp_replace(btrim(coalesce(department, '')), '\s+', ' ', 'g'))
  )
  WHERE email IS NULL;
