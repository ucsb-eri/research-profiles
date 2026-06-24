import db from '../config/db_config.js';

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
    profile_url: profile_url = website // use website as profile URL if not provided
  } = faculty;

  const result = await db.query(
    `INSERT INTO faculty (name, title, specialization, email, phone, office, website, photo_url, research_areas, department, profile_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    // Use ON CONFLICT to avoid duplicates based on email
    [name, title, specialization, email, phone, office, website, photo_url, research_areas, department, profile_url]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id; // inserted
  }

  // Fetch the existing faculty ID if insert was skipped
  const existing = await db.query(
    `SELECT id FROM faculty WHERE email = $1`,
    [email]
  );

  return existing.rows[0]?.id ?? null;
};





//GETS

// Stable ordering is required for correct pagination — LIMIT/OFFSET without an
// ORDER BY can repeat or skip rows between pages. Pagination is opt-in: omit
// `limit` to get the full list (keeps existing callers working).
export const getAll = async ({ limit = null, offset = 0 } = {}) => {
  if (limit === null) {
    const res = await db.query('SELECT * FROM faculty ORDER BY name ASC, id ASC');
    return res.rows;
  }
  const res = await db.query(
    'SELECT * FROM faculty ORDER BY name ASC, id ASC LIMIT $1 OFFSET $2',
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
    'SELECT * FROM faculty WHERE name ILIKE $1', 
    [`%${name}%`]
  );
  return res.rows;
};

export const getByDepartment = async (department) => {
  const res = await db.query(
    'SELECT * FROM faculty WHERE LOWER(department) = LOWER($1)', 
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


export const getByTopic = async (topic) => {
  const res = await db.query(
    'SELECT * FROM faculty WHERE topics ILIKE $1',
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


