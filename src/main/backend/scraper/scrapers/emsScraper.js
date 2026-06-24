import axios from 'axios';
import { load } from 'cheerio';

// The EMS people page mixes instructional faculty with administrative staff
// ("Budget and Financial Coordinator", etc.). Keep only instructional roles.
const INSTRUCTIONAL = /lecturer|instructor|professor|teaching|faculty|director/i;
const STAFF = /coordinator|manager|analyst|advisor|assistant|officer|specialist|administrat/i;
const isFacultyPosition = (p) => INSTRUCTIONAL.test(p || '') && !STAFF.test(p || '');

async function fetchProfileEmail(profileUrl) {
  if (!profileUrl) return null;
  try {
    const $ = load((await axios.get(profileUrl)).data);
    const $article = $('article.people-profile');
    const href =
      $article.find('a[href^="mailto:"]').first().attr('href') ||
      $('a[href^="mailto:"]').first().attr('href');
    if (href) return decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).trim() || null;
    // EMS profiles list the address as plain text, not a mailto link.
    const match = ($article.length ? $article : $('body')).text().match(/[\w.+-]+@[\w.-]+\.\w+/);
    return match ? match[0] : null;
  } catch (err) {
    console.error(`  Could not fetch email from ${profileUrl}: ${err.message}`);
    return null;
  }
}

async function enrichEmails(members, batchSize = 6) {
  for (let i = 0; i < members.length; i += batchSize) {
    await Promise.all(members.slice(i, i + batchSize).map(async (m) => {
      m.email = await fetchProfileEmail(m.profile_url);
    }));
  }
}

/**
 * Scrapes the UCSB English for Multilingual Students people page, faculty only.
 *
 * `div.views-row` layout with the name in `p.lead a` and the role in
 * `views-field-field-position`. The page includes staff, so we filter to
 * instructional positions. Email is fetched from each profile (plain text).
 *
 * @param {string} url - Full URL of the people page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeEMSFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.views-row').each((_, row) => {
      const $row = $(row);

      const nameElem = $row.find('p.lead a').first();
      const name = getText(nameElem);
      if (!name) return;

      const title = getText($row.find('div.views-field-field-position div.field-content').first());
      if (!isFacultyPosition(title)) return; // skip staff

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      let photoUrl = $row.find('div.views-field-field-people-photo img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email: null,          // Filled in below from the profile page
        phone: null,          // Not available on this page
        office: null,          // Not available on this page
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,   // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    await enrichEmails(facultyData);
    return facultyData;
  } catch (err) {
    console.error(`Error scraping English for Multilingual Students: ${err.message}`);
    return [];
  }
}
