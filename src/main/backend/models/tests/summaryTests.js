import { getFacultyResearchInfo } from '../facultySumm_model.js';
import { extractTextsFromUrls } from '../facultySumm_model.js'; 

const data = await getFacultyResearchInfo(200);
console.log(data);

const urls = data.urls;
const extractedTexts = await extractTextsFromUrls(urls);
console.log(extractedTexts);