import { scrapeDrupalFaculty } from './scrapers/genDrupalScraper.js';

const url = 'https://www.blackstudies.ucsb.edu/people/academic'

scrapeDrupalFaculty(url).then((facultyList) => {
  console.log(JSON.stringify(facultyList, null, 2));
});
console.log('Found ' + facultyList.length + ' faculty members.');