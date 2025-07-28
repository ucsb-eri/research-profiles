import db from '../config/db_config.js';

// insert faculty links
export const insertFacultyResearchLinks = async (facultyId, links) => {
  const { orcidUrl, googleScholarUrl, cvUrl, crawledUrls } = links;

  try {
    await db.query(
      `INSERT INTO faculty_research_links 
        (faculty_id, orcid_url, google_scholar_url, cv_url, crawled_urls) 
       VALUES ($1, $2, $3, $4, $5)`,
      [facultyId, orcidUrl, googleScholarUrl, cvUrl, crawledUrls]
    );
  } catch (err) {
    console.error('Error inserting faculty research links:', err.message);
  }
};

// get faculty research links by faculty ID
export const getFacultyResearchLinksById = async (facultyId) => {
  try {
    const res = await db.query(
      'SELECT * FROM faculty_research_links WHERE faculty_id = $1',
      [facultyId]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Error fetching faculty research links:', err.message);
    return null;
  }
};