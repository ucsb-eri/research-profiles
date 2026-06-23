import { scrapeAsianAmericanStudiesFaculty } from "../scrapers/asamstScraper.js";

async function test1() {
  try {
    const data = await scrapeAsianAmericanStudiesFaculty('https://www.asamst.ucsb.edu/people', 'Asian American Studies');
    console.log('Success: Scraped Faculty Data:\n');
    console.log(JSON.stringify(data, null, 2)); // Pretty print
    console.log(`\nTotal faculty found: ${data.length}`);
  } catch (err) {
    console.error('Scraper failed:', err.message);
  }
}

test1();
