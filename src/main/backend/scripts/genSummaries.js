import {
  getFacultyResearchInfo,
  extractTextsFromUrls,
  generateResearchSummary,
  upsertSummary,
} from '../models/facultySumm_model.js';

import db from '../config/db_config.js';

async function generateAllSummaries() {
  try {
    const res = await db.query('SELECT id FROM faculty');
    const ids = res.rows.map((row) => row.id);

    for (const id of ids) {
      const faculty = await getFacultyResearchInfo(id);
      if (!faculty || !faculty.urls?.length) {
        console.log(`Skipping ID ${id}: no URLs`);
        continue;
      }

      const combinedText = await extractTextsFromUrls(faculty.urls);
      if (!combinedText || combinedText.length < 100) {
        console.log(`Skipping ID ${id}: insufficient text`);
        continue;
      }

      const { summary, keywords } = await generateResearchSummary(combinedText, faculty);

      if (summary && keywords) {
        await upsertSummary(id, summary, keywords);
        console.log(`Processed faculty ID ${id}: ${faculty.name}`);
      } else {
        console.log(` Failed to generate summary for ID ${id}`);
      }
    }

    console.log('All summaries generated.');
  } catch (err) {
    console.error('Error generating summaries:', err.message);
  }
}

async function testGenSummary(){
    try{
        const faculty = await getFacultyResearchInfo(204);
        if (!faculty || !faculty.urls?.length) {
            console.log(`Skipping ID 204: no URLs`);
            return;
        }

        const combinedText = await extractTextsFromUrls(faculty.urls);
        if (!combinedText || combinedText.length < 100) {
            console.log(`Skipping ID 204: insufficient text`);
            return;
        }

        const { summary, keywords } = await generateResearchSummary(combinedText, faculty);

        if (summary && keywords) {
            await upsertSummary(201, summary, keywords);
            console.log(`Processed faculty ID 204: ${faculty.name}`);
            console.log(`Summary: ${summary}`);
            console.log(`Keywords: ${keywords}`);
        } else {
            console.log(`Failed to generate summary for ID 204`);
        }

    } catch(err){
        console.error('Error generating summary for ID 204:', err.message);
    }
}

// Run it
//generateAllSummaries();
testGenSummary();
