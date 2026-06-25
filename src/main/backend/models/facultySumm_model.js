import db from '../config/db_config.js';
import axios from 'axios';
import https from 'https';
import unfluff from 'unfluff';
import 'dotenv/config.js'

// Many UCSB department servers (web.ece.ucsb.edu, etc.) serve an incomplete
// certificate chain — they omit the intermediate CA cert, so Node can't build a
// path to a trusted root and the fetch fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE
// ("unable to verify the first certificate"). Browsers hide this by auto-fetching
// the missing intermediate; Node doesn't. We retry such hosts with verification
// off (see extractTextFromUrl). Safe here: we only read public, non-sensitive
// page text and send no credentials, so a MITM could at worst feed us bogus
// research text. Verification stays ON for every host that works.
const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// TLS chain errors worth retrying without verification. These all mean "the
// cert might be fine but Node couldn't validate the chain", not "the cert is
// actively wrong" — we deliberately don't retry on hostname mismatch, etc.
const TLS_CHAIN_ERRORS = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',   // server omitted the intermediate cert
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', // issuer not in the local trust store
  'SELF_SIGNED_CERT_IN_CHAIN',
]);

export const getFacultyResearchInfo = async (facultyId) => {
  try {
    // LEFT JOIN, not inner: faculty without a faculty_research_links row must
    // still come through so we can fall back to their profile page + the
    // structured research_areas/specialization fields we already scraped.
    const res = await db.query(
      `SELECT
        faculty.id, faculty.name, faculty.title, faculty.research_areas,
        faculty.specialization, faculty.department, faculty.profile_url,
        l.cv_url, l.orcid_url, l.google_scholar_url, l.crawled_urls
       FROM faculty
       LEFT JOIN faculty_research_links l ON faculty.id = l.faculty_id
       WHERE faculty.id = $1`,
      [facultyId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];

    // Combine all possible URLs into a flat array, dropping nulls and dupes. The
    // profile page is included as a text source — it usually carries the bio /
    // research statement and is often the only URL we have.
    const urls = [...new Set([
      row.profile_url,
      row.cv_url,
      row.orcid_url,
      row.google_scholar_url,
      ...(Array.isArray(row.crawled_urls)
        ? row.crawled_urls
        : row.crawled_urls?.split(',') ?? [])
    ].filter(Boolean))];

    return {
      id: row.id,
      name: row.name,
      title: row.title,
      department: row.department,
      research_areas: row.research_areas,
      specialization: row.specialization,
      profile_url: row.profile_url,
      urls,
    };
  } catch (err) {
    console.error('Error fetching faculty research info:', err.message);
    return null;
  }
};


/**
 * Fetch and extract readable text from a single URL
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} - The extracted readable text
 */
export async function extractTextFromUrl(url) {
  try {
    let response;
    try {
      response = await axios.get(url, { timeout: 7000 });
    } catch (err) {
      // Retry hosts with a broken/incomplete cert chain without TLS verification.
      if (!TLS_CHAIN_ERRORS.has(err.code)) throw err;
      console.warn(`TLS chain unverifiable for ${url} (${err.code}); retrying without verification`);
      response = await axios.get(url, { timeout: 7000, httpsAgent: insecureAgent });
    }
    const data = unfluff(response.data);
    return data.text?.trim() || '';
  } catch (err) {
    console.warn(`Failed to extract from ${url}: ${err.message}`);
    return '';
  }
}

/**
 * Extract and combine text from a list of URLs
 * @param {string[]} urls - List of research-related URLs
 * @param {number} concurrency - Number of parallel fetches (default 4)
 * @returns {Promise<string>} - Combined readable research text
 */
export async function extractTextsFromUrls(urls = [], concurrency = 4) {
  const results = [];

  // Basic queue logic for controlled concurrency
  const queue = [...urls];
  const workers = [];

  const worker = async () => {
    while (queue.length) {
      const url = queue.shift();
      if (!url) continue;
      const text = await extractTextFromUrl(url);
      if (text) results.push(text);
    }
  };

  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  // Combine all extracted text into one big string
  return results.join('\n\n');
}

// Coerce a model's value into a clean string[]. Accepts an array, or a
// comma-separated string in case a model returns keywords as text.
function toStringList(v) {
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// Parse the model's JSON reply, tolerating ```json fences or surrounding prose
// (some models add a sentence before/after the object even in JSON mode).
function parseSummaryReply(content) {
  if (!content) return null;
  let text = String(content).trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  if (!text.startsWith('{')) {
    const brace = text.match(/\{[\s\S]*\}/); // first {...} block
    if (brace) text = brace[0];
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Generate a research summary + keywords for a faculty member. Asks the model
// for structured JSON (response_format) instead of a fixed text layout, so we
// parse JSON rather than regex-scraping prose. The model is configurable via
// SUMMARY_MODEL (default gemma4:31b).
export async function generateResearchSummary(fullText, faculty, model = process.env.SUMMARY_MODEL || 'gemma4:31b') {
  const token = process.env.OLLAMA_API_KEY;
  const url = 'https://llm.grit.ucsb.edu/api/chat/completions';

  // High-signal structured fields we already hold. Passed explicitly so the
  // model uses them even when little/no page text could be scraped.
  const known = [
    faculty.research_areas ? `Known research areas: ${faculty.research_areas}` : null,
    faculty.specialization ? `Specialization: ${faculty.specialization}` : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are an academic research summarizer.

Using the information below about Professor ${faculty.name} (${faculty.title}, ${faculty.department}), produce:
- summary: a short paragraph (3-5 sentences) covering their research background, areas of impact, and expertise, written for undergraduate students interested in research.
- keywords: 5-8 concise keywords covering their specific research areas and expertise.
- broad_keywords: a few broader keywords a student might search to find this kind of research.

Base everything ONLY on the information provided below; do not invent facts. If the
information is sparse, keep the summary shorter rather than speculating.

Respond with ONLY a JSON object of the form:
{"summary": "...", "keywords": ["..."], "broad_keywords": ["..."]}
${known ? `\n${known}\n` : ''}
TEXT:
${fullText || '(no page text could be retrieved; rely on the fields above)'}`;

  try {
    const res = await axios.post(
      url,
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4, // steadier, less embellished summaries
        // Constrain the reply to JSON. OpenWebUI/Ollama honor response_format;
        // parseSummaryReply still recovers the object if a model adds stray prose.
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000 // 120 seconds
      }
    );

    const parsed = parseSummaryReply(res.data?.choices?.[0]?.message?.content);
    if (!parsed) {
      console.error(`LLM returned unparseable output for ${faculty.name}`);
      return { summary: '', keywords: [], broad_keywords: [] };
    }

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
      keywords: toStringList(parsed.keywords),
      broad_keywords: toStringList(parsed.broad_keywords),
    };
  } catch (err) {
    console.error(`LLM error for ${faculty.name}:`, err.message);
    return { summary: '', keywords: [], broad_keywords: [] };
  }
}

//insert summaries into the database

// Write an AI-generated summary: insert a new one, or refresh an existing
// AI one — but NEVER overwrite a row the owner has edited. The conditional
// ON CONFLICT ... WHERE makes that an atomic no-op when owner_edited is set.
// Returns true if it wrote, false if it was skipped (owner-edited or error).
export async function upsertSummary(facultyId, summary, keywords, broadKeywords) {
  try {
    const res = await db.query(
      `INSERT INTO faculty_summaries (faculty_id, summary, keywords, broad_keywords)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (faculty_id) DO UPDATE SET
         summary = EXCLUDED.summary,
         keywords = EXCLUDED.keywords,
         broad_keywords = EXCLUDED.broad_keywords
       WHERE faculty_summaries.owner_edited IS NOT TRUE
       RETURNING faculty_id`,
      [facultyId, summary, keywords, broadKeywords]
    );
    return res.rowCount > 0;
  } catch (err) {
    console.error(`DB upsert error for faculty ID ${facultyId}:`, err.message);
    return false;
  }
}

// Summary status for a faculty member, so the generator can skip owner-edited
// (and optionally already-summarized) rows before spending an LLM call.
export async function getSummaryStatus(facultyId) {
  const res = await db.query(
    `SELECT (summary IS NOT NULL AND btrim(summary) <> '') AS has_summary, owner_edited
       FROM faculty_summaries WHERE faculty_id = $1`,
    [facultyId]
  );
  if (res.rows.length === 0) return { exists: false, has_summary: false, owner_edited: false };
  return { exists: true, has_summary: res.rows[0].has_summary, owner_edited: res.rows[0].owner_edited };
}

// Owner-facing partial update of the AI content. Only the fields present in
// `fields` (summary / keywords / broad_keywords) are changed; the rest keep their
// current values. Creates the row if the faculty has no summary yet.
export async function updateSummaryFields(facultyId, fields = {}) {
  const existing = await db.query(
    'SELECT summary, keywords, broad_keywords FROM faculty_summaries WHERE faculty_id = $1',
    [facultyId]
  );
  const cur = existing.rows[0] || { summary: null, keywords: [], broad_keywords: [] };

  const summary = fields.summary !== undefined ? fields.summary : cur.summary;
  const keywords = fields.keywords !== undefined ? fields.keywords : cur.keywords;
  const broadKeywords = fields.broad_keywords !== undefined ? fields.broad_keywords : cur.broad_keywords;

  // Mark the row owner_edited = TRUE so AI generation won't overwrite it.
  const res = await db.query(
    `INSERT INTO faculty_summaries (faculty_id, summary, keywords, broad_keywords, owner_edited)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (faculty_id) DO UPDATE SET
       summary = EXCLUDED.summary,
       keywords = EXCLUDED.keywords,
       broad_keywords = EXCLUDED.broad_keywords,
       owner_edited = TRUE
     RETURNING summary, keywords, broad_keywords`,
    [facultyId, summary, keywords ?? [], broadKeywords ?? []]
  );
  return res.rows[0];
}

//gets from database
export async function getSummaryByFacultyId(facultyId) {
  try {
    const res = await db.query(
      `SELECT summary, owner_edited
       FROM faculty_summaries
       WHERE faculty_id = $1`,
      [facultyId]
    );

    if (res.rows.length === 0) return null;

    return res.rows[0]; // { summary, owner_edited }
  } catch (err) {
    console.error(`DB fetch error for faculty ID ${facultyId}:`, err.message);
    return null;
  }
}

// Clear the owner-edited flag so AI generation will manage this blurb again on
// the next run. Returns the row, or undefined if the faculty has no summary.
export async function clearOwnerEdited(facultyId) {
  const res = await db.query(
    `UPDATE faculty_summaries SET owner_edited = FALSE
     WHERE faculty_id = $1
     RETURNING summary, keywords, broad_keywords, owner_edited`,
    [facultyId]
  );
  return res.rows[0];
}

export async function getKeywordsByFacultyId(facultyId) {
  try {
    const res = await db.query(
      `SELECT keywords
       FROM faculty_summaries
       WHERE faculty_id = $1`,
      [facultyId]
    );  

    if (res.rows.length === 0) return null;

    return res.rows[0];
  } catch (err) {
    console.error(`DB fetch error for faculty ID ${facultyId}:`, err.message);
    return null;
  }
}

export async function getBroadKeywordsByFacultyId(facultyId) {
  try {
    const res = await db.query(
      `SELECT broad_keywords
       FROM faculty_summaries
       WHERE faculty_id = $1`,
      [facultyId]
    ); 

    if (res.rows.length === 0) return null;

    return res.rows[0];
  } catch (err) {
    console.error(`DB fetch error for faculty ID ${facultyId}:`, err.message);
    return null;
  }
}

export async function getBroadKeywordsbyDept(department){
  try {
    const res = await db.query(
      `SELECT DISTINCT unnest(broad_keywords) AS broad_keyword
       FROM faculty_summaries
       JOIN faculty ON faculty_summaries.faculty_id = faculty.id
       WHERE LOWER(faculty.department) = LOWER($1)`,
      [department]
    );
    if (res.rows.length === 0) return null;

    return res.rows.map(row => row.broad_keyword);
} catch (err) {
    console.error(`DB fetch error for department ${department}:`, err.message);
    return null;
 }
}
export async function getIdbyKeyword(keyword) {
  try {
    const res = await db.query(
      `SELECT DISTINCT faculty_id
       FROM faculty_summaries
       CROSS JOIN unnest(keywords) AS kw
       WHERE kw ILIKE $1`,
      [`%${keyword}%`]
    );

    if (res.rows.length === 0) return null;

    return res.rows.map(row => row.faculty_id);
  } catch (err) {
    console.error(`DB fetch error for keyword ${keyword}:`, err.message);
    return null;
  }
}