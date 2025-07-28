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
    topics: topics = null, // optional, depending on schema
    profileurl: profile_url = website // use website as profile URL if not provided
  } = faculty;

  await db.query(
    `INSERT INTO faculty (name, title, specialization, email, phone, office, website, photo_url, department, topics, profileurl)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    // Use ON CONFLICT to avoid duplicates based on email
    [name, title, specialization, email, phone, office, website, photo_url, department, topics, profile_url]
  );
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
    'SELECT * FROM faculty WHERE LOWER(name) LIKE LOWER($1)', 
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

export const getByTopic = async (topic) => {
  const res = await db.query(
    'SELECT * FROM faculty WHERE LOWER(topics) LIKE LOWER($1)', 
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


