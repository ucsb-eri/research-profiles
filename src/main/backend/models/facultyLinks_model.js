import db from '../config/db_config.js';

// insert faculty links
// export const insertFacultyResearchLinks = async (facultyId, links) => {
//   const { orcidUrl, googleScholarUrl, cvUrl, crawledUrls } = links;

//   try {
//     await db.query(
//       `INSERT INTO faculty_research_links 
//         (faculty_id, orcid_url, google_scholar_url, cv_url, crawled_urls) 
//        VALUES ($1, $2, $3, $4, $5)`,
//       [facultyId, orcidUrl, googleScholarUrl, cvUrl, crawledUrls]
//     );
//   } catch (err) {
//     console.error('Error inserting faculty research links:', err.message);
//   }
// };

export const insertFacultyResearchLinks = async (facultyId, links) => {
  const {
    orcidUrl = null,
    googleScholarUrl = null,
    cvUrl = null,
    crawledUrls = [],
    personal_website = null
  } = links;

  // Normalize + cap URLs
  const safeCrawledUrls = crawledUrls
    .filter(u => typeof u === 'string' && u.startsWith('http'))
    .slice(0, 6);

  try {
    const result = await db.query(
      `
      INSERT INTO faculty_research_links (
        faculty_id,
        orcid_url,
        google_scholar_url,
        cv_url,
        crawled_urls,
        personal_website
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (faculty_id)
      DO UPDATE SET
        orcid_url = COALESCE(EXCLUDED.orcid_url, faculty_research_links.orcid_url),
        google_scholar_url = COALESCE(EXCLUDED.google_scholar_url, faculty_research_links.google_scholar_url),
        cv_url = COALESCE(EXCLUDED.cv_url, faculty_research_links.cv_url),
        crawled_urls = CASE
          WHEN array_length(EXCLUDED.crawled_urls, 1) > 0
          THEN EXCLUDED.crawled_urls
          ELSE faculty_research_links.crawled_urls
        END,
        personal_website = COALESCE(EXCLUDED.personal_website, faculty_research_links.personal_website)
      RETURNING (xmax = 0) AS inserted
      `,
      [
        facultyId,
        orcidUrl,
        googleScholarUrl,
        cvUrl,
        safeCrawledUrls,
        personal_website
      ]
    );

    const inserted = result.rows[0]?.inserted;
    console.log(
      inserted
        ? `Inserted research links for faculty ${facultyId}`
        : `Updated research links for faculty ${facultyId}`
    );
  } catch (err) {
    console.error(
      `Error upserting research links for faculty ${facultyId}:`,
      err.message
    );
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