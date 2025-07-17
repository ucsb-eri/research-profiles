import { scrapeDrupalGeneral } from '../scrapers/genDrupalScraper.js';

const url = 'https://www.blackstudies.ucsb.edu/people/academic';
const departmentName = 'Black Studies';

scrapeDrupalGeneral(url, departmentName).then((facultyList) => {
  console.log(JSON.stringify(facultyList, null, 2));
  console.log('Found ' + facultyList.length + ' faculty members.');
});