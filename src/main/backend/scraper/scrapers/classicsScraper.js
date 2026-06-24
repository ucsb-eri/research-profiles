import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Classics faculty page.
 *
 * This is a WordPress directory rendered as an HTML table: each person is a
 * `tbody tr` with four cells - photo, name/title/area, office, and email. The
 * name cell holds a `.directory-name` link ("Last, First"), a `<dt>` job title,
 * and a `<dd>` research area (sometimes prefixed "Area:"). The office cell mixes
 * the room with office hours separated by a `<br>`, so we keep only the first
 * line. Email is on the listing page.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeClassicsFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('tbody tr').each((_, tr) => {
      const $tr = $(tr);

      const nameElem = $tr.find('a.directory-name').first();
      const name = getText(nameElem);
      if (!name) return; // skip header/empty rows

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($tr.find('dt').first());

      // Research area lives in <dd>; some entries prefix it with "Area:".
      let specialization = getText($tr.find('dd').first());
      if (specialization) {
        specialization = specialization.replace(/^Area:\s*/i, '').trim() || null;
      }

      // The office cell mixes "Room<br>hours"; keep only the first line.
      const officeCell = $tr.find('td').eq(2);
      let office = null;
      if (officeCell.length) {
        const firstNode = officeCell.contents().get(0);
        office = firstNode && firstNode.type === 'text'
          ? firstNode.data.replace(/\s+/g, ' ').trim() || null
          : getText(officeCell);
      }

      const emailElem = $tr.find('a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $tr.find('img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization,
        email,
        phone: null,           // Not available on this page
        office,
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,   // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Classics: ${err.message}`);
    return [];
  }
}
