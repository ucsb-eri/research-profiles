import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Military Science (ROTC) people page.
 *
 * This page is not a Drupal "views" listing but a freeform layout of paragraph
 * "column" blocks (`div.paragraph--type--column`). Each person block has a photo
 * `<img>`, an `<h3>` name, and a `<p>` whose lines (split by `<br>`) carry the
 * role(s), an `Office: <phone>` line, and an `Email: <mailto>` line. Blocks
 * without an `<h3>` are spacers/headers and are skipped.
 *
 * @param {string} url - Full URL of the people page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty/staff data objects.
 */
export async function scrapeMilitaryScienceFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.paragraph--type--column').each((_, col) => {
      const $col = $(col);

      const name = getText($col.find('h3').first());
      if (!name) return; // spacer/header column with no person

      // Split the description paragraph into lines on <br> so we can separate the
      // role(s) from the Office (phone) and Email lines.
      const $p = $col.find('p').first();
      const lines = $p
        .html()
        ? $p
            .html()
            .split(/<br\s*\/?>/i)
            .map((seg) => load(seg).root().text().replace(/\s+/g, ' ').trim())
            .filter(Boolean)
        : [];

      let phone = null;
      const titleParts = [];
      for (const line of lines) {
        const officeMatch = line.match(/^Office:\s*(.+)$/i);
        if (officeMatch) {
          phone = officeMatch[1].trim() || null;
          continue;
        }
        if (/^Email:/i.test(line)) continue;
        titleParts.push(line);
      }
      const title = titleParts.length ? titleParts.join(', ') : null;

      const emailElem = $col.find('a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $col.find('img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email,
        phone,
        office: null,          // Not available on this page (only an office phone)
        website: null,         // No per-person profile pages
        photo_url: photoUrl,
        research_areas: null,  // Not available on this page
        department,
        profile_url: null,     // No per-person profile pages
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Military Science: ${err.message}`);
    return [];
  }
}
