import { scrapeDrupalGeneral } from './scrapers/genDrupalScraper.js';
import { scrapeDrupalDirectory } from './scrapers/dirDrupalScraper.js';

let url = 'https://www.blackstudies.ucsb.edu/people/academic'
let departmentName = 'Black Studies';

scrapeDrupalGeneral(url, departmentName).then((facultyList) => {
  console.log(JSON.stringify(facultyList, null, 2));
  console.log('Found ' + facultyList.length + ' faculty members.');
});

// directory style drupal scrapers

 url = 'https://www.geol.ucsb.edu/people/faculty'
 departmentName = 'Geography';


scrapeDrupalDirectory(url, departmentName).then((facultyList) => {
  console.log(JSON.stringify(facultyList, null, 2));
  console.log('Found ' + facultyList.length + ' faculty members.');
});

