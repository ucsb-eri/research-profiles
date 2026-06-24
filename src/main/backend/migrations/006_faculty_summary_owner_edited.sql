-- 006_faculty_summary_owner_edited.sql
-- Track whether a faculty summary ("blurb") has been edited by the profile
-- owner, so AI generation never overwrites it.
--
--   * Owner edits (updateSummaryFields) set owner_edited = TRUE.
--   * AI generation (upsertSummary) only writes where owner_edited IS NOT TRUE.
--
-- Existing rows default to FALSE (treated as AI-generated / safe to regenerate).
-- If any pre-existing summaries were owner-edited before this column existed,
-- flag them manually, e.g.:
--   UPDATE faculty_summaries SET owner_edited = TRUE WHERE faculty_id IN (...);

ALTER TABLE faculty_summaries
  ADD COLUMN IF NOT EXISTS owner_edited BOOLEAN NOT NULL DEFAULT FALSE;
