import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Writing Program people page.
 *
 * Unlike the grid-based Drupal layouts, this page is a `<table>`: each `<tr>`
 * is one person with four cells — photo (`views-field-field-photo`), name +
 * title (`views-field-field-title`), office (`views-field-field-phone`, despite
 * the field name it holds the room location), and email
 * (`views-field-field-email`). The name is the first `<a>` of the title cell and
 * the role text follows it (split across `<br>`), so we read the name link and
 * the remaining cell text separately.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeWritingFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('tbody tr').each((_, tr) => {
      const $tr = $(tr);

      const nameElem = $tr.find('td.views-field-field-title a').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      // The title cell holds the name link then the role text after <br> tags.
      // Remove the name link clone so only the role lines remain.
      const $titleCell = $tr.find('td.views-field-field-title').first().clone();
      $titleCell.find('a').remove();
      const title = $titleCell.text().replace(/\s+/g, ' ').trim() || null;

      const office = getText($tr.find('td.views-field-field-phone').first());

      const emailElem = $tr.find('td.views-field-field-email a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $tr.find('td.views-field-field-photo img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email,
        phone: null,          // Not available on this page (office only)
        office,
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,  // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Writing Program: ${err.message}`);
    return [];
  }
}
