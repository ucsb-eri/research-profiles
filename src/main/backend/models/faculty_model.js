import db from '../config/db.js';

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


