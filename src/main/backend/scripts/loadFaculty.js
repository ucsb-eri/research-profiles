import { scrapeDrupalGeneral} from '../scraper/scrapers/genDrupalScraper.js';
import { scrapeDrupalDirectory } from '../scraper/scrapers/dirDrupalScraper.js';
import { artScraper } from '../scraper/scrapers/artScraper.js';
import { scrapeAnthropologyFaculty } from '../scraper/scrapers/anthroScraper.js';
import { scrapeResponsiveGrid } from '../scraper/scrapers/responsiveGridScraper.js';
import { scrapeEnvironmentalStudiesFaculty } from '../scraper/scrapers/envStudiesScraper.js';
import { scrapeFeministStudiesFaculty } from '../scraper/scrapers/feministScraper.js';
import { insertFaculty } from '../models/faculty_model.js';
import db from '../config/db_config.js';
import { scrapeCSFaculty } from '../scraper/scrapers/csScraper.js';
import { scrapeEnglishFaculty } from '../scraper/scrapers/englishScraper.js';
import { gatherResearchLinks } from '../scraper/scrapers/researchLinkScraper.js';
import { insertFacultyResearchLinks } from '../models/facultyLinks_model.js';

const scrapingJobs = [
  {
    url: 'https://www.blackstudies.ucsb.edu/people',
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
  },
  //not added to database yet
  {
    url: 'https://www.arts.ucsb.edu/faculty/',
    scraper: artScraper,
    department: 'Art'
  },
  {
    url: 'https://www.anth.ucsb.edu/people',
    scraper: scrapeAnthropologyFaculty,
    department: 'Anthropology'

  },
  {
    url: 'https://www.asamst.ucsb.edu/people',
    scraper: scrapeResponsiveGrid,
    department: 'Asian American Studies'
  },
  {
    url: 'https://www.cs.ucsb.edu/people/faculty',
    scraper: scrapeCSFaculty,
    department: 'Computer Science'
  },
  {
    url: 'https://www.english.ucsb.edu/people/faculty',
    scraper: scrapeEnglishFaculty,
    department: 'English'

  },
  {
    // Same page also covers the CSV's "Developmental Biology" row (identical URL).
    url: 'https://www.mcdb.ucsb.edu/people/faculty',
    scraper: scrapeDrupalDirectory,
    department: 'Molecular, Cellular, and Developmental Biology'
  },
  {
    url: 'https://es.ucsb.edu/index.php/people/faculty',
    scraper: scrapeEnvironmentalStudiesFaculty,
    department: 'Environmental Studies'
  },
  {
    url: 'https://femst.ucsb.edu/people/academic',
    scraper: scrapeFeministStudiesFaculty,
    department: 'Feminist Studies'
  },
  {
    // One combined page covers the CSV's separate "Dance" and "Theater" rows.
    // CSV listed /people/academic (404); the live path is /people.
    url: 'https://www.theaterdance.ucsb.edu/people',
    scraper: scrapeResponsiveGrid,
    department: 'Theater and Dance'
  },
  {
    // CSV listed /technology-management-people (404); the live path is /people.
    url: 'https://tmp.ucsb.edu/people',
    scraper: scrapeDrupalGeneral,
    department: 'Technology Management'
  },
  {
    // CSV listed /all-faculty (404); the live path is /people.
    url: 'https://www.frit.ucsb.edu/people',
    scraper: scrapeResponsiveGrid,
    department: 'French and Italian'
  },
  {
    // CSV listed /people/faculty (404); the live path is /faculty. This page
    // also covers the CSV's "Middle East Studies" row (a program housed in the
    // Religious Studies dept, same listing).
    url: 'https://www.religion.ucsb.edu/faculty',
    scraper: scrapeResponsiveGrid,
    department: 'Religious Studies'
  }

];

async function main() {
  let grandTotal = 0;

  for (const job of scrapingJobs) {
    console.log(`Scraping: ${job.department}...`);

    // Scrape one department. A failure here (e.g. the source page moved and
    // returns 404) must not abort the whole run, so handle it per-department.
    let facultyList;
    try {
      facultyList = await job.scraper(job.url, job.department);
    } catch (err) {
      console.error(`  Skipping ${job.department}: scrape failed (${err.message})`);
      continue;
    }

    if (!Array.isArray(facultyList) || facultyList.length === 0) {
      console.warn(`  No faculty parsed for ${job.department} — source page may have changed. Skipping.`);
      continue;
    }

    let inserted = 0;
    for (const faculty of facultyList) {
      faculty.department = job.department; // add department field
      if (!faculty.name) {
        console.warn(`  Skipping a ${job.department} entry with no name`);
        continue;
      }

      try {
        const faculty_id = await insertFaculty(faculty);
        inserted++;

        if (faculty.website && faculty.website != faculty.profile_url) {
          try {
            const links = await gatherResearchLinks(faculty.website);
            await insertFacultyResearchLinks(faculty_id, links);
          } catch (err) {
            console.error(`  Error gathering research links for ${faculty.name}:`, err.message);
          }
        }
      } catch (err) {
        console.error(`  Error inserting ${faculty.name}:`, err.message);
      }
    }

    grandTotal += inserted;
    console.log(`  Inserted ${inserted}/${facultyList.length} faculty from ${job.department}`);
  }

  console.log(`Done. Inserted ${grandTotal} faculty across all departments.`);
  await db.end();
}

main();
