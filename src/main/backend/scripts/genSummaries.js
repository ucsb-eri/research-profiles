import fs from 'fs/promises';
import {
  getFacultyResearchInfo,
  extractTextsFromUrls,
  generateResearchSummary,
  upsertSummary,
  getSummaryStatus,
} from '../models/facultySumm_model.js';

import db from '../config/db_config.js';

// Flags (all optional):
//   --only-missing      only generate for faculty with no summary yet. This is
//                       the RESUME switch: re-run after an interruption and it
//                       skips everything already done and continues.
//   --limit N           stop after attempting N faculty this run (batching). On
//                       stop it prints the --start-after id to continue from.
//   --start-after ID    skip faculty with id <= ID (explicit resume point).
//   --report PATH       write the run report here (default: summary_run_<ts>.md).
//   --no-report         don't write a report file.
// Owner-edited summaries are ALWAYS skipped (never overwritten).
const ONLY_MISSING = process.argv.includes('--only-missing');
const NO_REPORT = process.argv.includes('--no-report');
const strArg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const numArg = (flag) => {
  const v = strArg(flag);
  if (v == null) return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};
const LIMIT = numArg('--limit');
const START_AFTER = numArg('--start-after');
const REPORT_PATH = strArg('--report');

const MODEL = process.env.SUMMARY_MODEL || 'gemma4:31b';

// Tally no-text rows by their `cause` field.
const NO_TEXT_CAUSES = ['no-links-row', 'no-urls', 'extract-empty'];
function countCauses(rows) {
  const counts = Object.fromEntries(NO_TEXT_CAUSES.map(c => [c, 0]));
  for (const r of rows) if (r.cause in counts) counts[r.cause]++;
  return counts;
}

// Build the markdown run report from the collected outcomes.
function buildReport(r) {
  const list = (rows) =>
    rows.length ? rows.map(x => `- ${x.id} — ${x.name ?? '(unknown)'}`).join('\n') : '_none_';
  const noTextCounts = countCauses(r.noText);
  const lines = [
    `# Summary generation run — ${r.finishedAt}`,
    '',
    `- Model: \`${MODEL}\``,
    `- Flags: only-missing=${ONLY_MISSING}, limit=${LIMIT ?? 'none'}, start-after=${START_AFTER ?? 'none'}`,
    `- Duration: ${(r.durationMs / 1000).toFixed(1)}s`,
    r.stoppedAtLimit ? `- Stopped at --limit; resume with: \`--start-after ${r.lastId}\`` : '- Completed full scan',
    '',
    '## Totals',
    '',
    '| Generated | Failed | Owner-edited | No text | Already-summarized |',
    '|---|---|---|---|---|',
    `| ${r.generated.length} | ${r.failed.length} | ${r.skippedOwner} | ${r.noText.length} | ${r.skippedExisting} |`,
    '',
    `## Failed (${r.failed.length})`,
    'Summaries the model returned empty/unparseable — worth a manual look.',
    '',
    list(r.failed),
    '',
    `## No research text (${r.noText.length})`,
    'No usable URLs/text to summarize, broken down by cause:',
    '',
    '| Cause | Count | Recoverable by scraping? |',
    '|---|---|---|',
    `| no-links-row | ${noTextCounts['no-links-row']} | yes — no research-links row exists yet |`,
    `| no-urls | ${noTextCounts['no-urls']} | yes — links row exists but all URL fields empty |`,
    `| extract-empty | ${noTextCounts['extract-empty']} | unlikely — URLs exist but yielded <100 chars |`,
    '',
    `### no-links-row (${noTextCounts['no-links-row']})`,
    list(r.noText.filter(x => x.cause === 'no-links-row')),
    '',
    `### no-urls (${noTextCounts['no-urls']})`,
    list(r.noText.filter(x => x.cause === 'no-urls')),
    '',
    `### extract-empty (${noTextCounts['extract-empty']})`,
    list(r.noText.filter(x => x.cause === 'extract-empty')),
    '',
    `## Generated (${r.generated.length})`,
    '',
    list(r.generated),
    '',
  ];
  return lines.join('\n');
}

async function generateAllSummaries() {
  const startedMs = Date.now();
  const generated = [], failed = [], noText = [];
  let attempted = 0, skippedOwner = 0, skippedExisting = 0;
  let lastId = START_AFTER;     // last id handled, for the resume hint
  let stoppedAtLimit = false;

  try {
    // Deterministic id order so --start-after and resuming are stable run-to-run.
    const params = [];
    let q = 'SELECT id FROM faculty';
    if (START_AFTER != null) { params.push(START_AFTER); q += ` WHERE id > $${params.length}`; }
    q += ' ORDER BY id';
    const res = await db.query(q, params);
    const ids = res.rows.map((row) => row.id);

    for (const id of ids) {
      if (LIMIT != null && attempted >= LIMIT) {
        stoppedAtLimit = true;
        console.log(`Reached --limit ${LIMIT}. Resume the next batch with: --start-after ${lastId}`);
        break;
      }
      lastId = id;

      // Never overwrite a blurb the owner has edited; optionally skip any that
      // already have a summary. Checked up front so we don't waste an LLM call.
      const status = await getSummaryStatus(id);
      if (status.owner_edited) { skippedOwner++; continue; }
      if (ONLY_MISSING && status.has_summary) { skippedExisting++; continue; }

      const faculty = await getFacultyResearchInfo(id);
      // Three distinct reasons a faculty has no text to summarize, tracked
      // separately so the report shows how many the scraper could recover:
      //   no-links-row   — no faculty_research_links row at all (inner join
      //                     returns null); scraping can create one.
      //   no-urls        — links row exists but every URL field is empty;
      //                     scraping can fill it.
      //   extract-empty  — URLs exist but yielded <100 chars of text (dead
      //                    links, JS-only pages, unparseable PDFs); needs a
      //                    manual look, re-scraping rarely helps.
      if (!faculty) { noText.push({ id, name: null, cause: 'no-links-row' }); continue; }
      if (!faculty.urls?.length) { noText.push({ id, name: faculty.name, cause: 'no-urls' }); continue; }

      const combinedText = await extractTextsFromUrls(faculty.urls);
      if (!combinedText || combinedText.length < 100) {
        noText.push({ id, name: faculty.name, cause: 'extract-empty' }); continue;
      }

      attempted++;
      const { summary, keywords, broad_keywords } = await generateResearchSummary(combinedText, faculty);

      if (summary?.trim() &&
          Array.isArray(keywords) && keywords.length > 0 &&
          Array.isArray(broad_keywords) && broad_keywords.length > 0) {
        // upsertSummary also refuses to overwrite owner-edited rows, so this is
        // safe even if the owner edited between the check above and now.
        const wrote = await upsertSummary(id, summary, keywords, broad_keywords);
        if (wrote) {
          generated.push({ id, name: faculty.name });
          console.log(`[${generated.length}] id ${id}: ${faculty.name}`);
        } else {
          skippedOwner++;
        }
      } else {
        failed.push({ id, name: faculty.name });
        console.log(`Failed to generate summary for id ${id}: ${faculty.name}`);
      }
    }

    const nt = countCauses(noText);
    console.log(
      `Done. Generated ${generated.length}, failed ${failed.length}, ` +
      `skipped ${skippedOwner} owner-edited, ${noText.length} no-text ` +
      `(${nt['no-links-row']} no-links-row, ${nt['no-urls']} no-urls, ` +
      `${nt['extract-empty']} extract-empty)` +
      (ONLY_MISSING ? `, ${skippedExisting} already-summarized` : '') +
      (stoppedAtLimit ? ` (stopped at limit; last id ${lastId})` : '') + '.'
    );
  } catch (err) {
    console.error('Error generating summaries:', err.message);
  } finally {
    // Always write a report (even on partial/errored runs) unless disabled.
    if (!NO_REPORT) {
      try {
        const finishedAt = new Date().toISOString();
        const path = REPORT_PATH || `summary_run_${finishedAt.replace(/[:.]/g, '-')}.md`;
        await fs.writeFile(path, buildReport({
          finishedAt, durationMs: Date.now() - startedMs, stoppedAtLimit, lastId,
          generated, failed, noText, skippedOwner, skippedExisting,
        }), 'utf8');
        console.log(`Report written to ${path}`);
      } catch (e) {
        console.error('Failed to write report:', e.message);
      }
    }
    await db.end(); // close the pool so the script exits cleanly
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
