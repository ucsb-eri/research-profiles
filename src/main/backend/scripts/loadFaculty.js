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
  {
    url: 'https://www.eemb.ucsb.edu/people/faculty',
    scraper: scrapeDrupalDirectory,
    department: 'Ecology, Evolution, and Marine Biology'

  },
  {
    url: 'https://www.econ.ucsb.edu/people/faculty',
    scraper: scrapeDrupalDirectory,
    department: 'Economics'
  },
  {
    url: 'https://www.geog.ucsb.edu/people/faculty',
    scraper: scrapeDrupalDirectory,
    department: 'Geography'
  },
  {
    url: 'https://www.igpms.ucsb.edu/people/core-faculty',
    scraper: scrapeDrupalDirectory,
    department: 'Marine Science Graduate Program'
  },
  {
    url: 'https://www.physics.ucsb.edu/people/faculty',
    scraper: scrapeDrupalDirectory,
    department: 'Physics'
  },
  {
    url: 'https://www.ece.ucsb.edu/people/faculty',
    scraper: scrapeDrupalDirectory,
    department: 'Electrical and Computer Engineering'
  }
];

async function main() {
  try {
    for (const job of scrapingJobs) {
      console.log(`Scraping: ${job.department}...`);

      const facultyList = await job.scraper(job.url, job.department);


      for (const faculty of facultyList) {
        faculty.department = job.department; // add department field
        if (!faculty.name) {
            console.warn('Skipping faculty with no name:', { name: faculty.name, department: job.department });
            continue; // skip this insert
            }
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
