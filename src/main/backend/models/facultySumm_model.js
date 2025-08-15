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

  const MAX_CHARS = 5000;
  const textToSend = fullText.length > MAX_CHARS ? fullText.slice(0, MAX_CHARS) : fullText;

  const prompt = `
You are an academic research summarizer.

Given the following information extracted from web pages related to Professor ${faculty.name} (${faculty.title}, ${faculty.department}), write a short paragraph summarizing their research background, areas of impact, and expertise. Then list 5–8 concise keywords representing their core research areas.

TEXT:
${textToSend}

OUTPUT FORMAT:
Summary: <summary here>
Keywords: <comma-separated keywords here>
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
    const summaryMatch = output.match(/\*\*Summary:\*\*\s*([\s\S]+?)\n\*\*Keywords:\*\*/);
    const keywordsMatch = output.match(/\*\*Keywords:\*\*\s*([\s\S]+)/);


    // console.log(`LLM output for ${faculty.name}:\n${output}\n`);
    // console.log(`Summary for ${faculty.name}:\n${summaryMatch?.[1]?.trim() ?? ''}\n`);
    // console.log(`Keywords for ${faculty.name}:\n${keywordsMatch?.[1]?.trim() ?? ''}\n`);

    return {
      summary: summaryMatch?.[1]?.trim() ?? '',
      keywords: keywordsMatch?.[1]?.trim() ?? '',
    };
  } catch (err) {
    console.error(`LLM error for ${faculty.name}:`, err.message);
    return { summary: '', keywords: '' };
  }
}

//insert summaries into the database

export async function upsertSummary(facultyId, summary, keywords) {
  try {
    await db.query(
      `INSERT INTO faculty_research_summary (faculty_id, summary, keywords)
       VALUES ($1, $2, $3)
       ON CONFLICT (faculty_id)
       DO UPDATE SET summary = EXCLUDED.summary, keywords = EXCLUDED.keywords`,
      [facultyId, summary, keywords]
    );
  } catch (err) {
    console.error(`DB upsert error for faculty ID ${facultyId}:`, err.message);
  }
}

