import axios from 'axios';
import { load } from 'cheerio';

/**
 * Fetches a single LAIS affiliate profile page and extracts the email.
 *
 * The faculty listing carries no emails, so we follow each profile link. The
 * profile prints the address after a bold `Email:` label, and the same page
 * also repeats the LAIS program staff addresses in a sidebar/footer. To avoid
 * picking up those, we prefer the `mailto:` that follows the `Email:` label and
 * only fall back to the first `mailto:` if no label is present.
 *
 * @param {string} profileUrl - Absolute URL of the person's profile page.
 * @returns {Promise<string|null>} The email address, or null if unavailable.
 */
async function fetchProfileEmail(profileUrl) {
  if (!profileUrl) return null;
  try {
    const res = await axios.get(profileUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = res.data;

    // Prefer the address directly after the "Email:" label.
    const labelled = html.match(/Email:[\s\S]{0,40}?mailto:([^"'?]+)/i);
    if (labelled) return decodeURIComponent(labelled[1]).trim() || null;

    const $ = load(html);
    const href = $('a[href^="mailto:"]').first().attr('href');
    if (href) {
      return decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).trim() || null;
    }
    return null;
  } catch (err) {
    console.error(`  Could not fetch email from ${profileUrl}: ${err.message}`);
    return null;
  }
}

/**
 * Scrapes the UCSB Latin American and Iberian Studies faculty page.
 *
 * This is a WordPress query-loop page: each affiliate is a
 * `li.wp-block-post` with a featured-image figure (photo + profile link), an
 * `h2.wp-block-post-title a` (name "Last, First" + profile link), and a
 * `div.wp-block-post-excerpt` holding the title/affiliation. Email is not on the
 * listing and is pulled from each affiliate's profile page.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeLaisFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('li.wp-block-post').each((_, item) => {
      const $item = $(item);

      const nameElem = $item.find('h2.wp-block-post-title a').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($item.find('div.wp-block-post-excerpt').first());

      let photoUrl =
        $item.find('figure.wp-block-post-featured-image img').first().attr('src') || null;
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
    console.error(`Error scraping Latin American and Iberian Studies: ${err.message}`);
    return [];
  }
}
