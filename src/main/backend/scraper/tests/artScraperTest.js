import scrapeArtFaculty from '../scrapers/artScraper.js';

async function test() {
  try {
    const data = await scrapeArtFaculty('https://www.arts.ucsb.edu/faculty/', 'Art');
    console.log('Success: Scraped Faculty Data:\n');
    console.log(JSON.stringify(data, null, 2)); // Pretty print
    console.log(`\nTotal faculty found: ${data.length}`);
  } catch (err) {
    console.error('Scraper failed:', err.message);
  }
}

test();