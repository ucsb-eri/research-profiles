import db from '../config/db_config.js';
import { DIVISION_ORDER } from '../scraper/divisions.js';

//insert faculty into db

export const insertFaculty = async (faculty) => {
  const {
    name: name,
    title: title,
    specialization: specialization,
    email: email,
    phone: phone,
    office: office,
    website: website,
    photo_url: photo_url,
    department: department,
    research_areas: research_areas = null, // Default to null if not provided
    profile_url: profile_url = website, // use website as profile URL if not provided
    division: division = null // UCSB division; set by the loader from divisions.js
  } = faculty;

  // ON CONFLICT with no target catches BOTH unique guards: the email UNIQUE
  // constraint, and the partial unique index on (lower(name), lower(department))
  // WHERE email IS NULL (migration 004) that stops null-email re-inserts.
  const result = await db.query(
    `INSERT INTO faculty (name, title, specialization, email, phone, office, website, photo_url, research_areas, department, profile_url, division)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [name, title, specialization, email, phone, office, website, photo_url, research_areas, department, profile_url, division]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id; // inserted
  }

  // Insert skipped on a unique conflict — return the existing row's id. Look it
  // up by email when present, otherwise by the (name, department) guard. The
  // expressions mirror migration 004's index so we find the row that blocked us.
  if (email) {
    const existing = await db.query('SELECT id FROM faculty WHERE email = $1', [email]);
    return existing.rows[0]?.id ?? null;
  }

  const existing = await db.query(
    `SELECT id FROM faculty
      WHERE email IS NULL
        AND lower(regexp_replace(btrim(name), '\\s+', ' ', 'g'))
            = lower(regexp_replace(btrim($1), '\\s+', ' ', 'g'))
        AND lower(regexp_replace(btrim(coalesce(department, '')), '\\s+', ' ', 'g'))
            = lower(regexp_replace(btrim(coalesce($2, '')), '\\s+', ' ', 'g'))
      ORDER BY id
      LIMIT 1`,
    [name, department]
  );
  return existing.rows[0]?.id ?? null;
};





//GETS

// Default browse ordering: by last name. `name` is stored as "First Last", so a
// plain ORDER BY name sorts by first name; regexp_replace strips everything up
// to the last space, leaving the last token to sort on (case-insensitively).
// Single-word names fall through unchanged. Tiebreak by full name then id so
// pagination stays stable.
const ORDER_BY_LAST_NAME =
  `ORDER BY lower(regexp_replace(trim(name), '^.* ', '')) ASC, name ASC, id ASC`;

// Stable ordering is required for correct pagination — LIMIT/OFFSET without an
// ORDER BY can repeat or skip rows between pages. Pagination is opt-in: omit
// `limit` to get the full list (keeps existing callers working).
export const getAll = async ({ limit = null, offset = 0 } = {}) => {
  if (limit === null) {
    const res = await db.query(`SELECT * FROM faculty ${ORDER_BY_LAST_NAME}`);
    return res.rows;
  }
  const res = await db.query(
    `SELECT * FROM faculty ${ORDER_BY_LAST_NAME} LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return res.rows;
};

// Total faculty count, for paginated clients (e.g. infinite scroll) to know
// when they've loaded everything.
export const countAll = async () => {
  const res = await db.query('SELECT COUNT(*)::int AS count FROM faculty');
  return res.rows[0].count;
};

export const getById = async (id) => {
  const res = await db.query('SELECT * FROM faculty WHERE id = $1', [id]);
  return res.rows[0];
};

export const getByName = async (name) => {
  const res = await db.query(
    `SELECT * FROM faculty WHERE name ILIKE $1 ${ORDER_BY_LAST_NAME}`,
    [`%${name}%`]
  );
  return res.rows;
};

export const getByDepartment = async (department) => {
  const res = await db.query(
    `SELECT * FROM faculty WHERE LOWER(department) = LOWER($1) ${ORDER_BY_LAST_NAME}`,
    [department]
  );
  return res.rows;
};

export const getDepartments = async () => {
  const res = await db.query(
    'SELECT DISTINCT department FROM faculty ORDER BY department'
  );
  return res.rows.map(row => row.department);
}

export const getByDivision = async (division) => {
  const res = await db.query(
    `SELECT * FROM faculty WHERE LOWER(division) = LOWER($1) ${ORDER_BY_LAST_NAME}`,
    [division]
  );
  return res.rows;
};

// Divisions with their departments, for the grouped filter dropdown. Returns
// [{ division, departments: [...] }], divisions and departments each sorted.
export const getDivisionsGrouped = async () => {
  const res = await db.query(
    `SELECT division, department
       FROM faculty
      WHERE division IS NOT NULL AND department IS NOT NULL
      GROUP BY division, department
      ORDER BY division, department`
  );
  const byName = new Map();
  for (const { division, department } of res.rows) {
    let entry = byName.get(division);
    if (!entry) {
      entry = { division, departments: [] };
      byName.set(division, entry);
    }
    entry.departments.push(department);
  }
  // Order divisions by the canonical UCSB order; anything not listed there
  // (e.g. future/legacy divisions) falls to the end, alphabetically.
  const rank = (d) => {
    const i = DIVISION_ORDER.indexOf(d);
    return i === -1 ? DIVISION_ORDER.length : i;
  };
  return [...byName.values()].sort(
    (a, b) => rank(a.division) - rank(b.division) || a.division.localeCompare(b.division)
  );
};


export const getByTopic = async (topic) => {
  const res = await db.query(
    `SELECT * FROM faculty WHERE topics ILIKE $1 ${ORDER_BY_LAST_NAME}`,
    [`%${topic}%`]
  );
  return res.rows;
};

export const getAllbyDeptTopic = async (department, topic) => {
  let query = 'SELECT * FROM faculty WHERE 1=1';
  const params = [];

  if (department) {
    params.push(department);
    query += ` AND LOWER(department) = LOWER($${params.length})`;
  }

  if (topic) {
    params.push(`%${topic}%`);
    query += ` AND LOWER(topics) LIKE LOWER($${params.length})`;
  }

  query += ` ${ORDER_BY_LAST_NAME}`;
  const res = await db.query(query, params);
  return res.rows;
};

// Columns an owner is allowed to edit on their own profile. Anything else in the
// request body is ignored, so a forged field can't touch id/email-uniqueness rules
// it shouldn't (email is included intentionally so owners can correct it).
const EDITABLE_FACULTY_COLUMNS = [
  'specialization',
  'research_areas',
  'website',
  'office',
  'phone',
  'profile_url',
  'email',
];

// Update the allowlisted fields present in `fields`. Returns the updated row, or
// undefined if nothing valid was provided / the id doesn't exist.
export const updateFaculty = async (id, fields = {}) => {
  const cols = EDITABLE_FACULTY_COLUMNS.filter(c => fields[c] !== undefined);
  if (cols.length === 0) return undefined;

  const setClause = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const params = cols.map(c => fields[c]);
  params.push(id);

  const res = await db.query(
    `UPDATE faculty SET ${setClause} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return res.rows[0];
};

// Minimum relevance for a row to count as a search match. Shared by
// searchFaculty and countSearchFaculty so the page and its total stay in sync.
const SEARCH_THRESHOLD = 0.15;

// The scoring CTE used by both search and its count. $1 is the query string;
// each row gets a `rank` = best pg_trgm similarity across its searchable fields.
const SCORED_CTE = `
  WITH scored AS (
    SELECT f.*,
      GREATEST(
        similarity(f.name, $1),
        word_similarity($1, COALESCE(f.topics, '')),
        word_similarity($1, COALESCE(f.research_areas, '')),
        word_similarity($1, COALESCE(f.department, '')),
        word_similarity($1, COALESCE(s.summary, '')),
        word_similarity($1, COALESCE(array_to_string(s.keywords, ' '), '')),
        word_similarity($1, COALESCE(array_to_string(s.broad_keywords, ' '), ''))
      ) AS rank
    FROM faculty f
    LEFT JOIN faculty_summaries s ON s.faculty_id = f.id
  )`;

// Unified fuzzy, typo-tolerant search across faculty + their LLM summaries.
// Uses pg_trgm: word_similarity(query, field) matches the query words inside longer
// text, and the best-scoring field becomes the row's relevance `rank`.
// Requires the pg_trgm extension (see scripts/setupSearch.sql).
export const searchFaculty = async (q, { limit = 20, offset = 0, threshold = SEARCH_THRESHOLD } = {}) => {
  const res = await db.query(
    `${SCORED_CTE}
     SELECT * FROM scored
     WHERE rank >= $2
     ORDER BY rank DESC, name ASC
     LIMIT $3 OFFSET $4`,
    [q, threshold, limit, offset]
  );
  return res.rows;
};

// Total number of faculty matching a search (ignores limit/offset), so paginated
// clients know when they've loaded every result. Uses the same scoring +
// threshold as searchFaculty.
export const countSearchFaculty = async (q, { threshold = SEARCH_THRESHOLD } = {}) => {
  const res = await db.query(
    `${SCORED_CTE}
     SELECT COUNT(*)::int AS count FROM scored
     WHERE rank >= $2`,
    [q, threshold]
  );
  return res.rows[0].count;
};


