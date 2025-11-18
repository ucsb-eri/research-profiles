import db from "../config/db_config.js";
import { scrapeBlackStudies } from "../scraper/scrapers/blackStudiesScraper.js";


//work in progress
async function updateFacultyPhotos() {
  const url = "https://www.blackstudies.ucsb.edu/people";
  const dept = "Black Studies";

  console.log(`Scraping latest faculty data for ${dept}...`);
  const newFaculty = await scrapeBlackStudies(url, dept);

  let updates = 0;
  let notFound = 0;

  for (const f of newFaculty) {
    console.log(f.name, f.photo_url);
    if (!f.name || !f.photo_url) continue;

    try {
      const queryResult = await db.query(
        `UPDATE faculty
         SET photo_url = $1
         WHERE LOWER(TRIM(name)) = LOWER(TRIM($2))`,
        [f.photo_url, f.name]
      );

      if (queryResult.rowCount > 0) {
        updates++;
        console.log(`Updated photo for ${f.name}`);
      } else {
        notFound++;
        console.log(`No match found for ${f.name}`);
      }
    } catch (err) {
      console.error(`Error updating ${f.name}:`, err.message);
    }
  }

  console.log(`\nDone! Updated ${updates} photo URLs.`);
  console.log(`Could not find matches for ${notFound} faculty members.`);
  process.exit(0);
}

updateFacultyPhotos().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});