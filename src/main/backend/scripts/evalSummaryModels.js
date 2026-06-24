import 'dotenv/config';
import fs from 'fs/promises';
import {
  getFacultyResearchInfo,
  extractTextsFromUrls,
  generateResearchSummary,
} from '../models/facultySumm_model.js';
import db from '../config/db_config.js';

// A/B summary-model eval. Extracts each sample faculty's research text ONCE, then
// runs every model over that same text so the comparison is apples-to-apples.
// Writes a side-by-side markdown report and prints a timing/success table.
//
// Usage:
//   node src/main/backend/scripts/evalSummaryModels.js
//   node src/main/backend/scripts/evalSummaryModels.js --n 8 --models gemma4:31b,qwen3.5:latest
//   node src/main/backend/scripts/evalSummaryModels.js --ids 12,45,201
//   (or: npm run eval:summaries -- --n 10 --models gemma4:31b,qwen3.5:latest,gpt-oss:20b)

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { a[argv[i].slice(2)] = argv[i + 1]; i++; }
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const N = Math.max(1, parseInt(args.n, 10) || 10);
const MODELS = (args.models || 'gemma4:31b,qwen3.5:latest,gpt-oss:20b')
  .split(',').map(s => s.trim()).filter(Boolean);
const EXPLICIT_IDS = args.ids
  ? args.ids.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean)
  : null;

// Faculty to sample: explicit --ids, else those that have research links (so
// there's text to summarize). Grab extra candidates since some yield no text.
async function pickCandidates() {
  if (EXPLICIT_IDS) return EXPLICIT_IDS;
  const res = await db.query(
    'SELECT faculty_id FROM faculty_research_links ORDER BY faculty_id LIMIT $1',
    [N * 4]
  );
  return res.rows.map(r => r.faculty_id);
}

async function main() {
  const candidates = await pickCandidates();
  if (!candidates.length) {
    console.error('No faculty with research links found. Run `npm run data:scrape` first.');
    process.exitCode = 1;
    return;
  }

  // Prepare samples: extract each faculty's combined research text once.
  console.log(`Preparing up to ${N} sample(s)...`);
  const samples = [];
  for (const id of candidates) {
    if (samples.length >= N) break;
    const faculty = await getFacultyResearchInfo(id);
    if (!faculty || !faculty.urls?.length) continue;
    const text = await extractTextsFromUrls(faculty.urls);
    if (!text || text.length < 100) continue;
    samples.push({ faculty, text });
    console.log(`  ${samples.length}/${N}  ${faculty.name} (id ${id}, ${text.length} chars from ${faculty.urls.length} URLs)`);
  }

  if (!samples.length) {
    console.error('Could not extract usable research text for any candidate.');
    process.exitCode = 1;
    return;
  }

  console.log(`\nRunning models [${MODELS.join(', ')}] over ${samples.length} faculty...\n`);

  const stats = Object.fromEntries(MODELS.map(m => [m, { ms: 0, ok: 0, fail: 0 }]));
  const out = [
    `# Summary model A/B — ${samples.length} faculty × ${MODELS.length} model(s)`,
    `Models: ${MODELS.join(', ')}`,
  ];

  for (const { faculty, text } of samples) {
    out.push(`\n---\n\n## ${faculty.name} — ${faculty.department || '(no dept)'}`);
    out.push(`_${faculty.urls.length} source URLs, ${text.length} chars of extracted text_\n`);
    for (const model of MODELS) {
      const start = Date.now();
      const res = await generateResearchSummary(text, faculty, model);
      const ms = Date.now() - start;
      const ok = !!(res.summary && res.keywords.length);
      stats[model].ms += ms;
      stats[model][ok ? 'ok' : 'fail']++;
      console.log(`  ${faculty.name.padEnd(26)} ${model.padEnd(22)} ${ok ? 'ok  ' : 'FAIL'} ${(ms / 1000).toFixed(1)}s`);

      out.push(`### ${model} — ${(ms / 1000).toFixed(1)}s${ok ? '' : ' — ⚠️ FAILED/empty'}`);
      out.push(res.summary || '_(no summary returned)_');
      out.push(`\n**Keywords:** ${res.keywords.join(', ') || '—'}`);
      out.push(`**Broad:** ${res.broad_keywords.join(', ') || '—'}\n`);
    }
  }

  // Totals table
  out.push('\n---\n\n## Totals\n');
  out.push('| Model | OK | Fail | Avg time |');
  out.push('|---|---|---|---|');
  for (const m of MODELS) {
    const s = stats[m];
    const avg = (s.ms / Math.max(1, s.ok + s.fail) / 1000).toFixed(1);
    out.push(`| ${m} | ${s.ok} | ${s.fail} | ${avg}s |`);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = `summary_eval_${stamp}.md`;
  await fs.writeFile(outPath, out.join('\n'), 'utf8');

  console.log(`\nReport written to ${outPath}\n`);
  console.table(Object.fromEntries(MODELS.map(m => {
    const s = stats[m];
    return [m, { ok: s.ok, fail: s.fail, avgSec: +(s.ms / Math.max(1, s.ok + s.fail) / 1000).toFixed(1) }];
  })));
}

main()
  .catch(err => { console.error('Eval failed:', err.message); process.exitCode = 1; })
  .finally(async () => { try { await db.end(); } catch { /* pool already closed */ } });
