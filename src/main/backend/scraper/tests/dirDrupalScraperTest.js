import { scrapeDrupalDirectory } from '../scrapers/dirDrupalScraper.js';

const url = 'https://www.geol.ucsb.edu/people/faculty'
const deptName = 'Geography';

scrapeDrupalDirectory(url, deptName).then((facultyList) => {
  console.log(JSON.stringify(facultyList, null, 2));
  console.log('Found ' + facultyList.length + ' faculty members.');
});
