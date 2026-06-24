import axios from 'axios';
import { load } from 'cheerio';

/**
 * Fetches a single faculty member's profile page and extracts their email.
 *
 * The Film & Media faculty listing exposes no email, so we follow each profile
 * link and read the first `mailto:` link, falling back to scanning the page text
 * for an address.
 *
 * @param {string} profileUrl - Absolute URL of the person's profile page.
 * @returns {Promise<string|null>} The email address, or null if unavailable.
 */
async function fetchProfileEmail(profileUrl) {
  if (!profileUrl) return null;
  try {
    const res = await axios.get(profileUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);

    const href = $('a[href^="mailto:"]').first().attr('href');
    if (href) {
      return decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).trim() || null;
    }

    const match = $('body').text().match(/[\w.+-]+@[\w.-]+\.\w+/);
    return match ? match[0] : null;
  } catch (err) {
    console.error(`  Could not fetch email from ${profileUrl}: ${err.message}`);
    return null;
  }
}

/**
 * Scrapes the UCSB Film and Media Studies faculty page.
 *
 * A WordPress site where each person is a `div.entity--person` carrying the name
 * in `h3 a`, the title in the following `<p>`, research interests in
 * `ul.entity__interests li a`, and a lazy-loaded thumbnail (`img[data-src]`).
 * The /people/faculty/ page lists only faculty (other roles are on separate
 * pages), so no role filtering is needed. Emails are not on the listing and are
 * pulled from each person's profile page.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeFilmMediaFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.entity--person').each((_, item) => {
      const $item = $(item);

      const nameElem = $item.find('div.entity__meta h3 a').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($item.find('div.entity__meta > p').first());

      const interests = $item
        .find('ul.entity__interests li a')
        .map((__, a) => getText($(a)))
        .get()
        .filter(Boolean);
      const researchAreas = interests.length ? interests.join(', ') : null;

      // The thumbnail is lazy-loaded, so the real URL is in data-src.
      let photoUrl =
        $item.find('a.entity__thumb img').first().attr('data-src') ||
        $item.find('a.entity__thumb img').first().attr('src') ||
        null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null,  // Not available on this page
        email: null,           // Filled in below from the profile page
        phone: null,           // Not available on this page
        office: null,          // Not available on this page
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: researchAreas,
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
    console.error(`Error scraping Film and Media Studies: ${err.message}`);
    return [];
  }
}
