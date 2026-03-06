import db from '../config/db_config.js';
import { gatherResearchLinks } from '../scraper/scrapers/researchLinkScraper.js';
import { insertFacultyResearchLinks } from '../models/facultyLinks_model.js';

async function refreshFacultyResearchLinks() {
  try {
    const res = await db.query(
      `SELECT id, name, website FROM faculty
       WHERE website IS NOT NULL`
    );

    for (const faculty of res.rows) {
      try {
        console.log(`Refreshing research for ${faculty.name}`);

        const links = await gatherResearchLinks(faculty.website);

        await insertFacultyResearchLinks(faculty.id, links);

        if (links.publications?.length) {
          console.log(`→ ${faculty.name}: ${links.publications.length} publications found`);
        } else if (
          links.orcidUrl ||
          links.googleScholarUrl ||
          links.cvUrl
        ) {
          console.log(`→ ${faculty.name}: research links found`);
        } else {
          console.log(`→ ${faculty.name}: no research data`);
        }

      } catch (err) {
        console.error(
          `Error refreshing research for ${faculty.name}:`,
          err.message
        );
      }
    }

    console.log('Research refresh complete.');
  } catch (err) {
    console.error('Refresh failed:', err);
  } finally {
    db.end();
  }
}

refreshFacultyResearchLinks();