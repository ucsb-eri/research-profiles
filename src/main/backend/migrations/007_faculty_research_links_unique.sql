-- 007_faculty_research_links_unique.sql
-- Restore the per-faculty uniqueness of faculty_research_links.
--
-- Migration 001 declares faculty_id as PRIMARY KEY, but databases whose table was
-- created by an older `CREATE TABLE IF NOT EXISTS` never got that constraint
-- (IF NOT EXISTS won't alter an existing table). Without it, the scraper's upsert
-- fails with "no unique or exclusion constraint matching the ON CONFLICT
-- specification", and duplicate rows per faculty can accumulate.
--
-- This migration is idempotent: it dedupes, then adds the primary key only if the
-- table doesn't already have one. On a DB that already has the PK (created from
-- the current 001), the dedupe is a no-op and the constraint is left untouched.

-- 1. Drop rows with no faculty_id — they can't satisfy a PRIMARY KEY and are
--    orphaned (faculty_id references faculty(id)).
DELETE FROM faculty_research_links WHERE faculty_id IS NULL;

-- 2. Collapse duplicate faculty_id rows, keeping the most complete one (most
--    non-null link fields / non-empty crawl list), tie-broken by physical row id.
DELETE FROM faculty_research_links t
WHERE t.ctid IN (
  SELECT ctid FROM (
    SELECT ctid,
      row_number() OVER (
        PARTITION BY faculty_id
        ORDER BY (
          (cv_url IS NOT NULL)::int
          + (orcid_url IS NOT NULL)::int
          + (google_scholar_url IS NOT NULL)::int
          + (COALESCE(array_length(crawled_urls, 1), 0) > 0)::int
        ) DESC,
        ctid DESC
      ) AS rn
    FROM faculty_research_links
  ) ranked
  WHERE rn > 1
);

-- 3. Add the primary key only if the table has no primary/unique constraint yet.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'faculty_research_links'::regclass
      AND contype IN ('p', 'u')
  ) THEN
    ALTER TABLE faculty_research_links ADD PRIMARY KEY (faculty_id);
  END IF;
END $$;
