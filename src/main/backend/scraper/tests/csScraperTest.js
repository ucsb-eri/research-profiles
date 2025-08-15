import { scrapeCSFaculty } from "../scrapers/csScraper.js";

async function testCSFaculty() {
  const url = 'https://www.cs.ucsb.edu/people/faculty';
  const department = 'Computer Science';
  const facultyData = await scrapeCSFaculty(url, department);
  console.log(facultyData);
  console.log(`\nTotal faculty found: ${facultyData.length}`);
}

testCSFaculty();
