-- 005_add_faculty_division.sql
-- Add a division column to faculty so the UI can filter/group by UCSB division
-- (Humanities and Fine Arts, Engineering, etc.). New inserts get division from
-- scraper/divisions.js; this migration backfills existing rows from the same
-- department -> division mapping (keep the VALUES list below in sync with it).

ALTER TABLE faculty ADD COLUMN IF NOT EXISTS division TEXT;

UPDATE faculty f
SET division = m.division
FROM (VALUES
    ('Art', 'Humanities and Fine Arts'),
    ('Classics', 'Humanities and Fine Arts'),
    ('Comparative Literature', 'Humanities and Fine Arts'),
    ('East Asian Languages and Cultural Studies', 'Humanities and Fine Arts'),
    ('English', 'Humanities and Fine Arts'),
    ('English for Multilingual Students', 'Humanities and Fine Arts'),
    ('Film and Media Studies', 'Humanities and Fine Arts'),
    ('French and Italian', 'Humanities and Fine Arts'),
    ('Germanic and Slavic Studies', 'Humanities and Fine Arts'),
    ('History', 'Humanities and Fine Arts'),
    ('History of Art and Architecture', 'Humanities and Fine Arts'),
    ('Jewish Studies', 'Humanities and Fine Arts'),
    ('Latin American and Iberian Studies', 'Humanities and Fine Arts'),
    ('Linguistics', 'Humanities and Fine Arts'),
    ('Media Arts and Technology', 'Humanities and Fine Arts'),
    ('Music', 'Humanities and Fine Arts'),
    ('Philosophy', 'Humanities and Fine Arts'),
    ('Religious Studies', 'Humanities and Fine Arts'),
    ('Spanish and Portuguese', 'Humanities and Fine Arts'),
    ('Theater and Dance', 'Humanities and Fine Arts'),
    ('Writing Program', 'Humanities and Fine Arts'),
    ('Chemistry and Biochemistry', 'Mathematical, Life, and Physical Sciences'),
    ('Earth Science', 'Mathematical, Life, and Physical Sciences'),
    ('Ecology, Evolution, and Marine Biology', 'Mathematical, Life, and Physical Sciences'),
    ('Environmental Studies', 'Mathematical, Life, and Physical Sciences'),
    ('Geography', 'Mathematical, Life, and Physical Sciences'),
    ('Marine Science Graduate Program', 'Mathematical, Life, and Physical Sciences'),
    ('Mathematics', 'Mathematical, Life, and Physical Sciences'),
    ('Molecular, Cellular, and Developmental Biology', 'Mathematical, Life, and Physical Sciences'),
    ('Physics', 'Mathematical, Life, and Physical Sciences'),
    ('Psychological & Brain Sciences', 'Mathematical, Life, and Physical Sciences'),
    ('Statistics and Applied Probability', 'Mathematical, Life, and Physical Sciences'),
    ('Anthropology', 'Social Sciences'),
    ('Asian American Studies', 'Social Sciences'),
    ('Black Studies', 'Social Sciences'),
    ('Chicana and Chicano Studies', 'Social Sciences'),
    ('Communication', 'Social Sciences'),
    ('Economics', 'Social Sciences'),
    ('Feminist Studies', 'Social Sciences'),
    ('Global and International Studies', 'Social Sciences'),
    ('Military Science (ROTC)', 'Social Sciences'),
    ('Political Science', 'Social Sciences'),
    ('Sociology', 'Social Sciences'),
    ('Chemical Engineering', 'Engineering'),
    ('Computer Science', 'Engineering'),
    ('Electrical and Computer Engineering', 'Engineering'),
    ('Materials', 'Engineering'),
    ('Mechanical Engineering', 'Engineering'),
    ('Technology Management', 'Engineering'),
    ('Bren School of Environmental Science', 'Bren School of Environmental Science & Management'),
    ('College of Creative Studies', 'College of Creative Studies'),
    ('Gevirtz Graduate School of Education', 'Gevirtz Graduate School of Education')
) AS m(department, division)
WHERE f.department = m.department
  AND f.division IS DISTINCT FROM m.division;

-- Speeds up the /division filter and DISTINCT division lookups.
CREATE INDEX IF NOT EXISTS idx_faculty_division ON faculty (division);
