import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB College of Creative Studies people page.
 *
 * Unlike the other departments, CCS renders its people as an HTML table: each
 * person is a `tbody tr` with `<td>` cells for name, email, office, and the
 * affiliated major (stored as `specialization`). There is no photo or job
 * title. Many CCS people are cross-listed faculty from other departments;
 * email-based dedup in insertFaculty keeps those from being duplicated.
 *
 * @param {string} url - Full URL of the people page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeCCSFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('tbody tr').each((_, tr) => {
      const $tr = $(tr);

      const nameElem = $tr.find('td.views-field-title a').first();
      const name = getText(nameElem);
      if (!name) return; // skip header/empty rows

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const emailElem = $tr.find('td.views-field-field-email a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      const office = getText($tr.find('td.views-field-field-office').first());
      // The "page ref" column is the affiliated CCS major (e.g. Computing).
      const specialization = getText($tr.find('td.views-field-field-page-ref a').first());

      facultyData.push({
        name,
        title: null,           // No job title on this page
        specialization,
        email,
        phone: null,           // Not available on this page
        office,
        website: profileUrl,
        photo_url: null,        // Not available on this page
        research_areas: null,   // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping College of Creative Studies: ${err.message}`);
    return [];
  }
}
