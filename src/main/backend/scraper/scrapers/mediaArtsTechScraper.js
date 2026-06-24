import axios from 'axios';
import { load } from 'cheerio';

/**
 * De-obfuscates a MAT email address.
 *
 * MAT prints addresses as plain text like "jmjacobs (at) mat.ucsb.edu" to deter
 * scrapers, so we convert " (at) " back into "@". Returns null if the text does
 * not look like an obfuscated or plain address.
 *
 * @param {string|null} text - Raw contact-line text.
 * @returns {string|null} The de-obfuscated email, or null.
 */
function parseObfuscatedEmail(text) {
  if (!text) return null;
  const normalized = text.replace(/\s*\(\s*at\s*\)\s*/i, '@').replace(/\s+/g, '');
  const match = normalized.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return match ? match[0] : null;
}

/**
 * Scrapes the UCSB Media Arts and Technology (MAT) faculty page.
 *
 * This is a static (non-Drupal) page: each person is a `div.row` inside a
 * `section.people_page`, with the name in `h5 a`, the title in the following
 * `<p>`, and a `div.contact_info` whose paragraphs hold the office and an
 * obfuscated "user (at) domain" email. The Researchers/Staff section
 * (`#staff_researchers`) is skipped so only faculty are returned.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeMediaArtsTechFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    // Faculty live in the people sections except the researcher/staff bucket.
    $('section.people_page').each((_, section) => {
      const $section = $(section);
      if (($section.attr('id') || '') === 'staff_researchers') return;

      $section.find('div.row').each((__, row) => {
        const $row = $(row);

        const nameElem = $row.find('h5 a').first();
        const name = getText(nameElem);
        if (!name) return;

        const title = getText($row.find('div.col-md-9 > p').first());

        const $contact = $row.find('div.contact_info');

        let email = null;
        let office = null;
        let website = null;
        $contact.find('p').each((___, p) => {
          const $p = $(p);
          const txt = getText($p);
          if (!txt) return;
          if (!email && /\(\s*at\s*\)|@/.test(txt)) {
            email = parseObfuscatedEmail(txt);
            return;
          }
          // A "website:" line carries an external link.
          if (!website && $p.find('a[href^="http"]').length) {
            website = $p.find('a[href^="http"]').first().attr('href') || null;
            return;
          }
          // The remaining lines are the office/room location.
          if (!office) office = txt;
        });

        let photoUrl = $row.find('img').first().attr('src') || null;
        if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;
        else if (photoUrl?.startsWith('../')) photoUrl = baseUrl + '/' + photoUrl.replace(/^(\.\.\/)+/, '');

        facultyData.push({
          name,
          title,
          specialization: null, // Not available on this page
          email,
          phone: null,          // Not available on this page
          office,
          website,
          photo_url: photoUrl,
          research_areas: null,  // Not available on this page
          department,
          profile_url: null,     // No per-person profile pages on this site
        });
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Media Arts and Technology: ${err.message}`);
    return [];
  }
}
