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

      const { summary, keywords, broad_keywords } = await generateResearchSummary(combinedText, faculty);

      if (summary?.trim() && 
          Array.isArray(keywords) && keywords.length > 0 &&
          Array.isArray(broad_keywords) && broad_keywords.length > 0) {
        await upsertSummary(id, summary, keywords, broad_keywords);
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
        const faculty = await getFacultyResearchInfo(201);
        if (!faculty || !faculty.urls?.length) {
            console.log(`Skipping ID 201: no URLs`);
            return;
        }

        const combinedText = await extractTextsFromUrls(faculty.urls);
        if (!combinedText || combinedText.length < 100) {
            console.log(`Skipping ID 201: insufficient text`);
            return;
        }

        const { summary, keywords, broad_keywords } = await generateResearchSummary(combinedText, faculty);

        if (summary?.trim() && 
            Array.isArray(keywords) && keywords.length > 0 &&
            Array.isArray(broad_keywords) && broad_keywords.length > 0) {
            await upsertSummary(201, summary, keywords, broad_keywords);
            console.log(`Processed faculty ID 201: ${faculty.name}`);
            console.log(`Summary: ${summary}`);
            console.log(`Keywords: ${keywords}`);
            console.log(`Broad Keywords: ${broad_keywords}`);
        } else {
            console.log(`Failed to generate summary for ID 201`);
        }

    } catch(err){
        console.error('Error generating summary for ID 201:', err.message);
    }
}

// Run it
generateAllSummaries();
//testGenSummary();
