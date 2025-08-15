import { scrapeEnglishFaculty } from "../scrapers/englishScraper.js";

async function testEnglishFaculty() {
  const url = 'https://www.english.ucsb.edu/people/faculty';
  const department = 'English';
  const facultyData = await scrapeEnglishFaculty(url, department);
  console.log(facultyData);
  console.log(`\nTotal faculty found: ${facultyData.length}`);
}

testEnglishFaculty();
