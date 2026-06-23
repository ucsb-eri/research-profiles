import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Bren School faculty page.
 *
 * Standard Drupal `div.views-row` layout, but the name lives in
 * `views-field-title-1` (note the -1 suffix) rather than the `views-field-title`
 * the generic scraper expects. Name, title, email, and photo are all on the
 * listing page.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeBrenFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.views-row').each((_, row) => {
      const $row = $(row);

      const nameElem = $row.find('div.views-field-title-1 a').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($row.find('div.views-field-field-title div.field-content').first());

      const emailElem = $row.find('div.views-field-field-email a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $row.find('div.views-field-field-common-image img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email,
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
    console.error(`Error scraping Bren School: ${err.message}`);
    return [];
  }
}
