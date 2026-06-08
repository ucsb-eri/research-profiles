-- 002_search.sql
-- Fuzzy, typo-tolerant search support (pg_trgm) used by faculty_model.searchFaculty().
-- Enables trigram similarity and indexes the columns the search ranks across.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Reconcile schema drift before indexing. On databases whose tables predate
-- these migrations, the CREATE TABLE IF NOT EXISTS in 001 was a no-op, so a
-- column only ever queried by the old code (notably `topics`) can be missing.
-- These ALTERs are no-ops where the column already exists.
ALTER TABLE faculty           ADD COLUMN IF NOT EXISTS topics         TEXT;
ALTER TABLE faculty           ADD COLUMN IF NOT EXISTS research_areas TEXT;
ALTER TABLE faculty_summaries ADD COLUMN IF NOT EXISTS summary        TEXT;

CREATE INDEX IF NOT EXISTS idx_faculty_name_trgm              ON faculty            USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_faculty_topics_trgm            ON faculty            USING gin (topics gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_faculty_research_areas_trgm    ON faculty            USING gin (research_areas gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_faculty_department_trgm        ON faculty            USING gin (department gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_faculty_summaries_summary_trgm ON faculty_summaries  USING gin (summary gin_trgm_ops);
