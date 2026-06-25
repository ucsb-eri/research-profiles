-- 008_faculty_name_parts.sql
-- Add structured given/family name columns alongside the display `name`.
--
-- Department sites present names inconsistently ("First Last" vs "Last, First")
-- and surnames can be multi-word ("Van de Walle"). Sorting by a regexp on the
-- display string was fragile and wrong for both cases. first_name/last_name are
-- populated by parseName() (utils/nameParser.js) on insert, and backfilled for
-- existing rows by scripts/backfillNames.js (which reuses the same parser and
-- also normalizes `name` to canonical "First Last").
--
-- Columns are nullable: rows inserted before the backfill runs simply have NULL
-- parts, and the browse ordering falls back to the old last-token heuristic
-- until backfilled (see faculty_model.ORDER_BY_LAST_NAME).

ALTER TABLE faculty ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE faculty ADD COLUMN IF NOT EXISTS last_name  TEXT;

-- Supports the browse ordering (ORDER BY lower(last_name)).
CREATE INDEX IF NOT EXISTS idx_faculty_last_name ON faculty (lower(last_name));
