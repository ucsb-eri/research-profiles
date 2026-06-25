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
const NO_TEXT_CAUSES = ['no-source', 'extract-empty', 'no-faculty-row'];
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
    '| Cause | Count | What it means |',
    '|---|---|---|',
    `| no-source | ${noTextCounts['no-source']} | no URLs and no research-areas/specialization — nothing to use |`,
    `| extract-empty | ${noTextCounts['extract-empty']} | URLs exist but yielded <100 chars and no structured fields |`,
    `| no-faculty-row | ${noTextCounts['no-faculty-row']} | faculty id not found (deleted mid-run) |`,
    '',
    `### no-source (${noTextCounts['no-source']})`,
    list(r.noText.filter(x => x.cause === 'no-source')),
    '',
    `### extract-empty (${noTextCounts['extract-empty']})`,
    list(r.noText.filter(x => x.cause === 'extract-empty')),
    '',
    `### no-faculty-row (${noTextCounts['no-faculty-row']})`,
    list(r.noText.filter(x => x.cause === 'no-faculty-row')),
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
      // getFacultyResearchInfo now LEFT JOINs, so null only means the id vanished
      // mid-run (rare). Reasons a faculty ends up with no text to summarize:
      //   no-faculty-row — id not found (deleted between the id scan and here).
      //   no-source      — no URLs at all AND no research_areas/specialization;
      //                    truly nothing to work with.
      //   extract-empty  — had URLs but they yielded <100 chars (dead links,
      //                    JS-only pages, unparseable PDFs) AND no structured
      //                    fields to fall back on.
      if (!faculty) { noText.push({ id, name: null, cause: 'no-faculty-row' }); continue; }

      // Structured fields we already scraped are a usable baseline even when no
      // page text can be fetched, so they keep a faculty out of "no-text".
      const hasStructured = Boolean(faculty.research_areas?.trim() || faculty.specialization?.trim());
      const scrapedText = faculty.urls.length ? await extractTextsFromUrls(faculty.urls) : '';

      if (scrapedText.length < 100 && !hasStructured) {
        noText.push({ id, name: faculty.name, cause: faculty.urls.length ? 'extract-empty' : 'no-source' });
        continue;
      }

      attempted++;
      const { summary, keywords, broad_keywords } = await generateResearchSummary(scrapedText, faculty);

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
      `(${nt['no-source']} no-source, ${nt['extract-empty']} extract-empty, ` +
      `${nt['no-faculty-row']} no-faculty-row)` +
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
