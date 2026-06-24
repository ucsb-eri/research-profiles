import axios from 'axios';
import { load } from 'cheerio';

/**
 * Fetches a single faculty member's profile page and extracts their email.
 *
 * The Spanish & Portuguese core-faculty listing exposes name, title, and photo
 * but no email, so we follow each profile link. The address is a `mailto:` link
 * inside `article.people-profile`, with a plain-text fallback scoped to the same
 * article so we never grab the department/footer address.
 *
 * @param {string} profileUrl - Absolute URL of the person's profile page.
 * @returns {Promise<string|null>} The email address, or null if unavailable.
 */
async function fetchProfileEmail(profileUrl) {
  if (!profileUrl) return null;
  try {
    const res = await axios.get(profileUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const $article = $('article.people-profile');

    const href =
      $article.find('a[href^="mailto:"]').first().attr('href') ||
      $('a[href^="mailto:"]').first().attr('href');
    if (href) {
      return decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).trim() || null;
    }

    const match = ($article.length ? $article : $('body'))
      .text()
      .match(/[\w.+-]+@[\w.-]+\.\w+/);
    return match ? match[0] : null;
  } catch (err) {
    console.error(`  Could not fetch email from ${profileUrl}: ${err.message}`);
    return null;
  }
}

/**
 * Scrapes the UCSB Spanish & Portuguese core-faculty page.
 *
 * Uses the same multi-column `div.views-col` layout as Environmental Studies,
 * but the field classes differ: the name lives in `views-field-title h3 a` and
 * the job title in the `span.views-field-field-title h4`. The listing has no
 * email field, so each person's email is pulled from their profile page.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeSpanishPortugueseFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.views-col').each((_, col) => {
      const $col = $(col);

      const nameElem = $col.find('div.views-field-title h3 a').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($col.find('.views-field-field-title h4').first());

      let photoUrl = $col.find('div.views-field-field-photo img').first().attr('src') || null;
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
        research_areas: null,  // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    // Enrich each person with the email from their profile page concurrently.
    await Promise.all(
      facultyData.map(async (member) => {
        member.email = await fetchProfileEmail(member.profile_url);
      })
    );

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Spanish & Portuguese: ${err.message}`);
    return [];
  }
}
