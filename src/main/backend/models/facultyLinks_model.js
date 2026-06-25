import db from '../config/db_config.js';

// insert faculty links
export const insertFacultyResearchLinks = async (facultyId, links) => {
  const { orcidUrl, googleScholarUrl, cvUrl, crawledUrls } = links;

  try {
    // Upsert without relying on a faculty_id unique constraint. Some deployed
    // databases predate migration 001's PRIMARY KEY (the table was created by an
    // older `CREATE TABLE IF NOT EXISTS`, which never re-adds the constraint), so
    // `ON CONFLICT (faculty_id)` fails there with "no unique or exclusion
    // constraint matching the ON CONFLICT specification". UPDATE-then-INSERT works
    // regardless. COALESCE keeps a previously-found scalar link when this run
    // didn't find one; crawled_urls is replaced with the fresh crawl. loadFaculty
    // processes faculty serially, so there's no concurrent-insert race here.
    // (Migration 007 restores the constraint to prevent duplicates going forward.)
    const updated = await db.query(
      `UPDATE faculty_research_links SET
         orcid_url          = COALESCE($2, orcid_url),
         google_scholar_url = COALESCE($3, google_scholar_url),
         cv_url             = COALESCE($4, cv_url),
         crawled_urls       = $5
       WHERE faculty_id = $1`,
      [facultyId, orcidUrl, googleScholarUrl, cvUrl, crawledUrls]
    );

    if (updated.rowCount === 0) {
      await db.query(
        `INSERT INTO faculty_research_links
           (faculty_id, orcid_url, google_scholar_url, cv_url, crawled_urls)
         VALUES ($1, $2, $3, $4, $5)`,
        [facultyId, orcidUrl, googleScholarUrl, cvUrl, crawledUrls]
      );
    }
  } catch (err) {
    console.error('Error inserting faculty research links:', err.message);
  }
};

//get all faculty research links

export const getAllResearchLinks = async() => {
    try{
        const res = await db.query(
            'SELECT * FROM faculty_research_links'
        );
        return res;
    } catch(err){
        console.error('Error getting all faculty research links:', err.message);
        return null;
    }
}

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