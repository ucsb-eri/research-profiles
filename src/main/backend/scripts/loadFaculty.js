import { scrapeDrupalGeneral} from '../scraper/scrapers/genDrupalScraper.js';
import { scrapeDrupalDirectory } from '../scraper/scrapers/dirDrupalScraper.js';
import { insertFaculty } from '../models/faculty_model.js';
import db from '../config/db_config.js';

const scrapingJobs = [
  {
    url: 'https://www.blackstudies.ucsb.edu/people/academic',
    scraper: scrapeDrupalGeneral,
    department: 'Black Studies'
  },
  {
    url: 'https://www.geol.ucsb.edu/people/faculty',
    scraper: scrapeDrupalDirectory,
    department: 'Earth Science'
  },
];

async function main() {
  try {
    for (const job of scrapingJobs) {
      console.log(`🔍 Scraping: ${job.department}...`);

      const facultyList = await job.scraper(job.url, job.department);

      for (const faculty of facultyList) {
        faculty.Department = job.department; // add department field
        await insertFaculty(faculty);
      }

      console.log(`Successfully Inserted ${facultyList.length} faculty from ${job.department}`);
    }
  } catch (err) {
    console.error('Scraping failed:', err);
  } finally {
    db.end();
  }
}

main();
