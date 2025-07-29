import { scrapeAnthropologyFaculty } from "../scrapers/anthroScraper.js";

async function test1() {
  try {
    const data = await scrapeAnthropologyFaculty('https://www.anth.ucsb.edu/people/academic', 'Anthropology');
    console.log('Success: Scraped Faculty Data:\n');
    console.log(JSON.stringify(data, null, 2)); // Pretty print
    console.log(`\nTotal faculty found: ${data.length}`);
  } catch (err) {
    console.error('Scraper failed:', err.message);
  }
}

async function test2() {
  try {
    const data = await scrapeAnthropologyFaculty('https://www.asamst.ucsb.edu/people', 'Asian American Studies');
    console.log('Success: Scraped Faculty Data:\n');
    console.log(JSON.stringify(data, null, 2)); // Pretty print
    console.log(`\nTotal faculty found: ${data.length}`);
  } catch (err) {
    console.error('Scraper failed:', err.message);
  }
}

test1();
test2();
