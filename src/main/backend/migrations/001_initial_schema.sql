-- 001_initial_schema.sql
-- Core schema for the research-profiles backend.
-- Reconstructed from the INSERT/SELECT statements in src/main/backend/models/*.js.

CREATE TABLE IF NOT EXISTS faculty (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  title          TEXT,
  specialization TEXT,
  email          TEXT UNIQUE,          -- insertFaculty() relies on ON CONFLICT (email)
  phone          TEXT,
  office         TEXT,
  website        TEXT,
  photo_url      TEXT,
  research_areas TEXT,                 -- stored as text; scrapers pass either a comma string
                                       -- or a JS array that pg serializes to a "{a,b}" literal,
                                       -- which the frontend parses back into an array
  department     TEXT,
  profile_url    TEXT,
  topics         TEXT                  -- fuzzy-matched by /search ranking; not populated by current scrapers
);

CREATE TABLE IF NOT EXISTS faculty_summaries (
  faculty_id     INTEGER PRIMARY KEY REFERENCES faculty(id) ON DELETE CASCADE,
  summary        TEXT,
  keywords       TEXT[] NOT NULL DEFAULT '{}',
  broad_keywords TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS faculty_research_links (
  faculty_id         INTEGER PRIMARY KEY REFERENCES faculty(id) ON DELETE CASCADE,
  cv_url             TEXT,
  orcid_url          TEXT,
  google_scholar_url TEXT,
  crawled_urls       TEXT[] NOT NULL DEFAULT '{}'
);
