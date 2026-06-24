import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Chemical Engineering faculty page.
 *
 * A Drupal "view" rendered as a `<ul>` of `<li>` items. Each person carries the
 * name in `div.views-field-title span a`, the title (often multi-line, with
 * cross-listed department links) in `div.views-field-field-titles--departments`,
 * the email in `div.views-field-field-people-email a[href^="mailto:"]`, and the
 * photo in `div.views-field-field-image img`. Phone/office are not listed.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeChemicalEngineeringFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.view-people li').each((_, li) => {
      const $li = $(li);

      const nameElem = $li.find('div.views-field-title span a, div.views-field-title a').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($li.find('div.views-field-field-titles--departments div.field-content').first());

      const emailElem = $li.find('div.views-field-field-people-email a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $li.find('div.views-field-field-image img').first().attr('src') || null;
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
    console.error(`Error scraping Chemical Engineering: ${err.message}`);
    return [];
  }
}
