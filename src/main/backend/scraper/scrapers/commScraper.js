import axios from 'axios';
import { load } from 'cheerio';

/**
 * Fetches a single Communication profile page and extracts the email.
 *
 * The faculty listing only carries name/title/photo, so we follow each profile
 * link. The profile renders the address as a `mailto:` link inside the
 * `Contact` field. Note the markup uses a malformed `mailto::address` (double
 * colon), so we strip any leading colon left after removing the scheme.
 *
 * @param {string} profileUrl - Absolute URL of the person's profile page.
 * @returns {Promise<string|null>} The email address, or null if unavailable.
 */
async function fetchProfileEmail(profileUrl) {
  if (!profileUrl) return null;
  try {
    const res = await axios.get(profileUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const $article = $('article.people');

    const href =
      $article.find('a[href^="mailto:"]').first().attr('href') ||
      $('a[href^="mailto:"]').first().attr('href');
    if (!href) return null;

    return (
      decodeURIComponent(href.replace(/^mailto:/i, '').replace(/^:+/, '').split('?')[0]).trim() ||
      null
    );
  } catch (err) {
    console.error(`  Could not fetch email from ${profileUrl}: ${err.message}`);
    return null;
  }
}

/**
 * Scrapes the UCSB Communication faculty page.
 *
 * The listing is a multi-column grid: each `div.views-row` holds several people
 * spread across `div.views-col` cells, so we iterate the columns. Each cell has
 * a photo (`views-field-field-photo`), the name/profile link
 * (`views-field-title h3 a`), and the title (`views-field-field-affiliation`).
 * Email lives only on the individual profile pages, so it is fetched from there.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeCommunicationFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.views-row div.views-col').each((_, col) => {
      const $col = $(col);

      // The listing nests `<h3 class="views-field-title">` inside another `<h3>`,
      // which is invalid HTML; parsers split it so the name link ends up in a
      // sibling `<h3 class="field-content">`. Target the /people/ link directly.
      const nameElem = $col.find('h3.field-content a[href^="/people/"]').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($col.find('div.views-field-field-affiliation').first());

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

    // Enrich each person with the email from their profile page.
    await Promise.all(
      facultyData.map(async (member) => {
        member.email = await fetchProfileEmail(member.profile_url);
      })
    );

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Communication: ${err.message}`);
    return [];
  }
}
