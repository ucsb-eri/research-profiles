import { scrapeDrupalGeneral} from '../scraper/scrapers/genDrupalScraper.js';
import { scrapeDrupalDirectory } from '../scraper/scrapers/dirDrupalScraper.js';
import { artScraper } from '../scraper/scrapers/artScraper.js';
import { scrapeAnthropologyFaculty } from '../scraper/scrapers/anthroScraper.js';
import { scrapeResponsiveGrid } from '../scraper/scrapers/responsiveGridScraper.js';
import { scrapeEnvironmentalStudiesFaculty } from '../scraper/scrapers/envStudiesScraper.js';
import { scrapeFeministStudiesFaculty } from '../scraper/scrapers/feministScraper.js';
import { scrapeBrenFaculty } from '../scraper/scrapers/brenScraper.js';
import { scrapeCCSFaculty } from '../scraper/scrapers/ccsScraper.js';
import { scrapeMaterialsFaculty } from '../scraper/scrapers/materialsScraper.js';
import { scrapeHistoryFaculty } from '../scraper/scrapers/historyScraper.js';
import { scrapePstatFaculty } from '../scraper/scrapers/pstatScraper.js';
import { scrapeMechanicalEngineeringFaculty } from '../scraper/scrapers/mechanicalEngineeringScraper.js';
import { scrapeChemicalEngineeringFaculty } from '../scraper/scrapers/chemicalEngineeringScraper.js';
import { scrapeEastAsianFaculty } from '../scraper/scrapers/eastAsianScraper.js';
import { scrapeGSSFaculty } from '../scraper/scrapers/gssScraper.js';
import { scrapeClassicsFaculty } from '../scraper/scrapers/classicsScraper.js';
import { scrapeMusicFaculty } from '../scraper/scrapers/musicScraper.js';
import { scrapeCommunicationFaculty } from '../scraper/scrapers/commScraper.js';
import { scrapeWritingFaculty } from '../scraper/scrapers/writingScraper.js';
import { scrapeChicanoStudiesFaculty } from '../scraper/scrapers/chicanoStudiesScraper.js';
import { scrapeMilitaryScienceFaculty } from '../scraper/scrapers/militaryScienceScraper.js';
import { scrapeLaisFaculty } from '../scraper/scrapers/laisScraper.js';
import { scrapeSpanishPortugueseFaculty } from '../scraper/scrapers/spanishPortugueseScraper.js';
import { scrapeJewishStudiesFaculty } from '../scraper/scrapers/jewishStudiesScraper.js';
import { scrapeMediaArtsTechFaculty } from '../scraper/scrapers/mediaArtsTechScraper.js';
import { scrapeFilmMediaFaculty } from '../scraper/scrapers/filmMediaScraper.js';
import { scrapeEducationFaculty } from '../scraper/scrapers/educationScraper.js';
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
  },
  {
    url: 'https://bren.ucsb.edu/people/faculty',
    scraper: scrapeBrenFaculty,
    department: 'Bren School of Environmental Science'
  },
  {
    url: 'https://ccs.ucsb.edu/people',
    scraper: scrapeCCSFaculty,
    department: 'College of Creative Studies'
  },
  {
    // The /people/faculty page lists ~250 people of all roles; the scraper
    // filters to faculty (professors/lecturers/emeriti) only.
    url: 'https://www.materials.ucsb.edu/people/faculty',
    scraper: scrapeMaterialsFaculty,
    department: 'Materials'
  },
  {
    url: 'https://www.history.ucsb.edu/directory/faculty/',
    scraper: scrapeHistoryFaculty,
    department: 'History'
  },
  {
    url: 'https://www.pstat.ucsb.edu/people/faculty',
    scraper: scrapePstatFaculty,
    department: 'Statistics and Applied Probability'
  },
  {
    // ?tid=5 restricts the listing to faculty server-side.
    url: 'https://me.ucsb.edu/people?tid=5',
    scraper: scrapeMechanicalEngineeringFaculty,
    department: 'Mechanical Engineering'
  },
  {
    url: 'https://www.chemengr.ucsb.edu/people/faculty',
    scraper: scrapeChemicalEngineeringFaculty,
    department: 'Chemical Engineering'
  },
  {
    url: 'https://www.eastasian.ucsb.edu/people/faculty',
    scraper: scrapeEastAsianFaculty,
    department: 'East Asian Languages and Cultural Studies'
  },
  {
    url: 'https://gss.ucsb.edu/faculty',
    scraper: scrapeGSSFaculty,
    department: 'Germanic and Slavic Studies'
  },
  {
    url: 'https://www.classics.ucsb.edu/people/faculty',
    scraper: scrapeClassicsFaculty,
    department: 'Classics'
  },
  {
    // CSV listed /people (redirects to a landing page); the live path is /people/faculty.
    url: 'https://music.ucsb.edu/people/faculty',
    scraper: scrapeMusicFaculty,
    department: 'Music'
  },
  {
    url: 'https://www.comm.ucsb.edu/people/faculty',
    scraper: scrapeCommunicationFaculty,
    department: 'Communication'
  },
  {
    url: 'https://writing.ucsb.edu/people',
    scraper: scrapeWritingFaculty,
    department: 'Writing Program'
  },
  {
    url: 'https://www.chicst.ucsb.edu/people',
    scraper: scrapeChicanoStudiesFaculty,
    department: 'Chicana and Chicano Studies'
  },
  {
    url: 'https://www.milsci.ucsb.edu/people',
    scraper: scrapeMilitaryScienceFaculty,
    department: 'Military Science (ROTC)'
  },
  {
    url: 'https://lais.ucsb.edu/faculty/',
    scraper: scrapeLaisFaculty,
    department: 'Latin American and Iberian Studies'
  },
  {
    url: 'https://www.spanport.ucsb.edu/people/core-faculty',
    scraper: scrapeSpanishPortugueseFaculty,
    department: 'Spanish and Portuguese'
  },
  {
    url: 'https://www.jewishstudies.ucsb.edu/people',
    scraper: scrapeJewishStudiesFaculty,
    department: 'Jewish Studies'
  },
  {
    url: 'https://www.mat.ucsb.edu/faculty/',
    scraper: scrapeMediaArtsTechFaculty,
    department: 'Media Arts and Technology'
  },
  {
    url: 'https://www.filmandmedia.ucsb.edu/people/faculty/',
    scraper: scrapeFilmMediaFaculty,
    department: 'Film and Media Studies'
  },
  {
    // Listing is JS-rendered; the scraper queries the muster JSONP service the
    // page itself calls (database=ggsedb), filtered to faculty/lecturers.
    url: 'https://education.ucsb.edu/research-faculty/faculty',
    scraper: scrapeEducationFaculty,
    department: 'Gevirtz Graduate School of Education'
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
