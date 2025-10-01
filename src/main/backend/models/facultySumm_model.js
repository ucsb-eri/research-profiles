import db from '../config/db_config.js';
import axios from 'axios';
import unfluff from 'unfluff';
import 'dotenv/config.js'

export const getFacultyResearchInfo = async (facultyId) => {
  try {
    const res = await db.query(
      `SELECT 
        faculty.id, faculty.name, faculty.title, faculty.research_areas, faculty.department,
        faculty_research_links.cv_url, faculty_research_links.orcid_url, faculty_research_links.google_scholar_url, faculty_research_links.crawled_urls
       FROM faculty
       JOIN faculty_research_links ON faculty.id = faculty_research_links.faculty_id
       WHERE faculty.id = $1`,
      [facultyId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];

    // Combine all possible URLs into a flat array + clean nulls
    const urls = [
      row.cv_url,
      row.orcid_url,
      row.google_scholar_url,
      ...(Array.isArray(row.crawled_urls)
        ? row.crawled_urls
        : row.crawled_urls?.split(',') ?? [])
    ].filter(Boolean); 

    return {
      id: row.id,
      name: row.name,
      title: row.title,
      department: row.department,
      research_areas: row.research_areas,
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
    const response = await axios.get(url, { timeout: 7000 });
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

//generate summaries for a faculty member
export async function generateResearchSummary(fullText, faculty) {
  const token = process.env.OLLAMA_API_KEY;
  const url = 'https://llm.grit.ucsb.edu/api/chat/completions';

  // const MAX_CHARS = 5000;
  // const textToSend = fullText.length > MAX_CHARS ? fullText.slice(0, MAX_CHARS) : fullText;

  const prompt = `
You are an academic research summarizer.

Given the following information extracted from web pages related to Professor ${faculty.name} (${faculty.title}, ${faculty.department}), write a short paragraph summarizing their research background, areas of impact, and expertise for undergraduate students interested in research. Then list 5–8 concise keywords that cover the faculty's research areas and expertise and additional broader keywords that a student interested in this research might look up.

TEXT:
${fullText}

OUTPUT FORMAT:
Summary: <summary here>
Research Keywords: <comma-separated keywords here>
Broad Keywords: <comma-separated keywords here>
`;

  try {
    const res = await axios.post(
      url,
      {
        model: 'phi4:latest',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000 // 120 seconds
      }
    );

    const output = res.data.choices[0].message.content;
    //console.log(`LLM raw output for ${faculty.name}:\n${output}\n`);

    const summaryMatch = output.match(/\*?\*Summary:\*?\*\s*([\s\S]+?)\s*\*?\*Research Keywords:\*?\*/i);
    const keywordsMatch = output.match(/\*?\*Research Keywords:\*?\*\s*([\s\S]+?)\s*\*?\*Broad Keywords:\*?\*/i);
    const broadKeywordsMatch = output.match(/\*?\*Broad Keywords:\*?\*\s*([\s\S]+)/i);

    const summaryText = summaryMatch?.[1]?.trim() ?? '';

    const keywordsList = (keywordsMatch?.[1] ?? '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean); // remove empty strings

    const broadKeywordsList = (broadKeywordsMatch?.[1] ?? '')
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    return {
      summary: summaryText,
      keywords: keywordsList,
      broad_keywords: broadKeywordsList
    };

  } catch (err) {
    console.error(`LLM error for ${faculty.name}:`, err.message);
    return { summary: '', keywords: '', broad_keywords: '' };
  }
}

//insert summaries into the database

export async function upsertSummary(facultyId, summary, keywords, broadKeywords) {
  try {
    await db.query(
      `INSERT INTO faculty_summaries (faculty_id, summary, keywords, broad_keywords)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (faculty_id)
       DO UPDATE SET summary = EXCLUDED.summary, keywords = EXCLUDED.keywords, broad_keywords = EXCLUDED.broad_keywords`,
      [facultyId, summary, keywords, broadKeywords]
    );
  } catch (err) {
    console.error(`DB upsert error for faculty ID ${facultyId}:`, err.message);
  }
}

//gets from database
export async function getSummaryByFacultyId(facultyId) {
  try {
    const res = await db.query(
      `SELECT summary
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