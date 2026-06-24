import {
  getFacultyResearchInfo,
  extractTextsFromUrls,
  generateResearchSummary,
  upsertSummary,
  getSummaryStatus,
} from '../models/facultySumm_model.js';

import db from '../config/db_config.js';

// --only-missing : only generate for faculty with no summary yet (cheap reruns).
// Owner-edited summaries are ALWAYS skipped (never overwritten).
const ONLY_MISSING = process.argv.includes('--only-missing');

async function generateAllSummaries() {
  try {
    const res = await db.query('SELECT id FROM faculty');
    const ids = res.rows.map((row) => row.id);

    let processed = 0, skippedOwner = 0, skippedExisting = 0;
    for (const id of ids) {
      // Never overwrite a blurb the owner has edited; optionally skip any that
      // already have a summary. Checked up front so we don't waste an LLM call.
      const status = await getSummaryStatus(id);
      if (status.owner_edited) {
        skippedOwner++;
        console.log(`Skipping ID ${id}: owner-edited summary (left untouched)`);
        continue;
      }
      if (ONLY_MISSING && status.has_summary) {
        skippedExisting++;
        continue;
      }

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
        // upsertSummary also refuses to overwrite owner-edited rows, so this is
        // safe even if the owner edited between the check above and now.
        const wrote = await upsertSummary(id, summary, keywords, broad_keywords);
        if (wrote) {
          processed++;
          console.log(`Processed faculty ID ${id}: ${faculty.name}`);
        } else {
          skippedOwner++;
          console.log(`Skipping ID ${id}: became owner-edited mid-run`);
        }
      } else {
        console.log(` Failed to generate summary for ID ${id}`);
      }
    }

    console.log(
      `Done. Generated ${processed}, skipped ${skippedOwner} owner-edited` +
      (ONLY_MISSING ? `, skipped ${skippedExisting} already-summarized` : '') + '.'
    );
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
