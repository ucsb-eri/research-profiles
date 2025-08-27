import db from '../config/db_config.js';



// Helper function to process faculty data and parse arrays
export const processFacultyData = (facultyData) => {
  if (Array.isArray(facultyData)) {
    return facultyData.map(faculty => ({
      ...faculty,
      research_areas: parsePostgresArray(faculty.research_areas)
    }));
  } else if (facultyData) {
    return {
      ...facultyData,
      research_areas: parsePostgresArray(facultyData.research_areas)
    };
  }
  return facultyData;
};

// Export the utility function for testing
export const parsePostgresArray = (pgArray) => {
  if (!pgArray || typeof pgArray !== 'string') {
    return [];
  }
  
  // Remove the curly braces and split by comma
  // Handle cases where items might contain commas or quotes
  const cleanString = pgArray.replace(/^{|}$/g, '');
  if (!cleanString) return [];
  
  // Split by comma and clean up each item
  return cleanString.split(',').map(item => 
    item.trim().replace(/^"|"$/g, '') // Remove surrounding quotes if present
  );
};

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
  return processFacultyData(res.rows);
};

export const getById = async (id) => {
  const res = await db.query('SELECT * FROM faculty WHERE id = $1', [id]);
  return processFacultyData(res.rows[0]);
};

export const getByName = async (name) => {
  const res = await db.query(
    'SELECT * FROM faculty WHERE LOWER(name) LIKE LOWER($1)', 
    [`%${name}%`]
  );
  return processFacultyData(res.rows);
};

export const getByDepartment = async (department) => {
  const res = await db.query(
    'SELECT * FROM faculty WHERE LOWER(department) = LOWER($1)', 
    [department]
  );
  return processFacultyData(res.rows);
};

export const getByTopic = async (topic) => {
  const res = await db.query(
    'SELECT * FROM faculty WHERE LOWER(research_areas::text) LIKE LOWER($1)', 
    [`%${topic}%`]
  );
  return processFacultyData(res.rows);
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
    query += ` AND LOWER(research_areas::text) LIKE LOWER($${params.length})`;
  }

  const res = await db.query(query, params);
  return processFacultyData(res.rows);
};


