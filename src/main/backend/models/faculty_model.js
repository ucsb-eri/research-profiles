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

export const getAll = async () => {
  const res = await db.query('SELECT * FROM faculty');
  return res.rows;
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


