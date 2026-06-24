import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Mechanical Engineering people page.
 *
 * The `tid=5` query already restricts the listing to faculty. Each person is a
 * `div.views-row` with the photo/profile link in the leading `<a>`, the name in
 * `div.me-ppl-title a`, the title in `p.lead.serif`, and the email in
 * `p.ppl-email a[href^="mailto:"]`. Phone/office/specialization are not listed.
 *
 * @param {string} url - Full URL of the people page (should include ?tid=5).
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeMechanicalEngineeringFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.views-row').each((_, row) => {
      const $row = $(row);

      const nameElem = $row.find('div.me-ppl-title a').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($row.find('p.lead.serif').first());

      const emailElem = $row.find('p.ppl-email a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $row.find('img').first().attr('src') || null;
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
    console.error(`Error scraping Mechanical Engineering: ${err.message}`);
    return [];
  }
}
