import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Feminist Studies faculty page.
 *
 * One person per `div.views-row`, but the markup uses a teaser layout
 * (`h2.teaser-title` / `div.person-title`) rather than the `views-field-*`
 * fields the generic Drupal scraper expects. The listing page exposes name,
 * title, photo, and a profile link; email is not present here and is left null.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeFeministStudiesFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.views-row').each((_, row) => {
      const $row = $(row);

      const name = getText($row.find('h2.teaser-title').first());
      if (!name) return;

      let profileUrl = $row.find('div.views-field-nothing a').first().attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($row.find('div.person-title').first());

      let photoUrl = $row.find('img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email: null,          // Not available on this page
        phone: null,          // Not available on this page
        office: null,          // Not available on this page
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,  // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Feminist Studies: ${err.message}`);
    return [];
  }
}
