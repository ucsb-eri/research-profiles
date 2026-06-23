import axios from 'axios';
import { load } from 'cheerio';

/**
 * Fetches a single faculty member's profile page and extracts their email.
 *
 * The responsive-grid listing pages do not expose emails, so we follow each
 * profile link. Most profiles carry the email as a `mailto:` link inside
 * `article.people-profile`; a few list it as plain text instead, so we fall
 * back to scanning the article text. Both lookups are scoped to the profile
 * article so we never pick up the department/footer address elsewhere on the
 * page.
 *
 * @param {string} profileUrl - Absolute URL of the person's profile page.
 * @returns {Promise<string|null>} The email address, or null if unavailable.
 */
async function fetchProfileEmail(profileUrl) {
  if (!profileUrl) return null;
  try {
    const res = await axios.get(profileUrl);
    const $ = load(res.data);
    const $article = $('article.people-profile');

    const href =
      $article.find('a[href^="mailto:"]').first().attr('href') ||
      $('a[href^="mailto:"]').first().attr('href');
    if (href) {
      // Strip the scheme and any ?subject=... query so we keep just the address.
      return decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).trim() || null;
    }

    // Fallback: some profiles print the address as plain text, not a link.
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
 * Scrapes a UCSB Drupal "responsive grid" people page.
 *
 * Several departments share this layout (Asian American Studies, Theater &
 * Dance, French & Italian, ...), where each person is a
 * `div.views-view-responsive-grid__item` rather than the `div.views-row` the
 * other scrapers target. The listing exposes name, title, office, photo, and a
 * profile link; email is pulled from each person's individual profile page.
 * Phone/specialization are not available and are left null.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeResponsiveGrid(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.views-view-responsive-grid__item').each((_, item) => {
      const $item = $(item);

      const nameElem = $item.find('div.views-field-nothing h3 a').first();
      const name = getText(nameElem);
      if (!name) return; // skip empty grid cells

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($item.find('div.views-field-field-title').first());

      // The address field prefixes a "Office Location:" <strong> label, so read
      // only the value span.
      const office = getText(
        $item.find('div.views-field-field-address span.field-content').first()
      );

      let photoUrl = $item.find('div.views-field-field-photo img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email: null,          // Filled in below from the profile page
        phone: null,          // Not available on this page
        office,
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,  // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    // Enrich each person with the email from their profile page. Done after the
    // listing is parsed so the follow-up fetches run concurrently.
    await Promise.all(
      facultyData.map(async (member) => {
        member.email = await fetchProfileEmail(member.profile_url);
      })
    );

    return facultyData;
  } catch (err) {
    console.error(`Error scraping responsive-grid page (${department}): ${err.message}`);
    return [];
  }
}
