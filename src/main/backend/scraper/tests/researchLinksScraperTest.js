import { gatherResearchLinks } from "../scrapers/researchLinkScraper.js";

const url = 'https://boddylab.com/';

gatherResearchLinks(url).then((links) => {
    console.log(JSON.stringify(links, null, 5));
    console.log('Found ' + links.length + ' research links.');
    }).catch((err) => {
    console.error('Error gathering research links:', err.message);
});


