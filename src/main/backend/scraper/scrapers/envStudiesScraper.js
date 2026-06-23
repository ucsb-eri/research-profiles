import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Environmental Studies faculty page.
 *
 * Unlike the other Drupal layouts, each `div.views-row` here holds several
 * people laid out across `div.views-col` columns, so we iterate the columns
 * rather than the rows. Name, title, and email are all on the listing page.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeEnvironmentalStudiesFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.views-row div.views-col').each((_, col) => {
      const $col = $(col);

      const nameElem = $col.find('div.views-field-title h3 a').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($col.find('div.views-field-field-title h4').first());
      const phone = getText($col.find('div.views-field-field-phone div.field-content').first());

      const emailElem = $col.find('div.views-field-field-email a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $col.find('div.views-field-field-photo img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email,
        phone,
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
    console.error(`Error scraping Environmental Studies: ${err.message}`);
    return [];
  }
}
