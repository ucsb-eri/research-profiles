import db from '../config/db_config.js';
import axios from 'axios';
import unfluff from 'unfluff';

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

