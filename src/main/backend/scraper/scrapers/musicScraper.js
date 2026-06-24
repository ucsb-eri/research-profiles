import axios from 'axios';
import { load } from 'cheerio';

/**
 * Fetches a single Music faculty profile page and extracts the email.
 *
 * The faculty listing exposes no emails, so we follow each profile link. The
 * profile renders the address inside `field--name-field-email`; we scope the
 * mailto lookup there to avoid picking up secondary/personal addresses listed
 * elsewhere on the page.
 *
 * @param {string} profileUrl - Absolute URL of the person's profile page.
 * @returns {Promise<string|null>} The email address, or null if unavailable.
 */
async function fetchProfileEmail(profileUrl) {
  if (!profileUrl) return null;
  try {
    const res = await axios.get(profileUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);

    const href =
      $('.field--name-field-email a[href^="mailto:"]').first().attr('href') ||
      $('a[href^="mailto:"]').first().attr('href');
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
 * Scrapes the UCSB Music faculty page.
 *
 * Faculty are rendered as Drupal teaser nodes (`div.node--type-people`): each
 * holds the name (`<h2>`), position (`field-position`), headshot
 * (`field-image`), and a "Read more" profile link. The listing carries no
 * emails, so each person's email is pulled from their individual profile page.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeMusicFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.node--type-people').each((_, node) => {
      const $node = $(node);

      const name = getText($node.find('h2').first());
      if (!name) return;

      const title = getText($node.find('div.field--name-field-position').first());

      let profileUrl = $node.find('li.node-readmore a').first().attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      let photoUrl = $node.find('div.field--name-field-image img').first().attr('src') || null;
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
        research_areas: null,   // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    // Enrich each person with the email from their profile page, concurrently.
    await Promise.all(
      facultyData.map(async (member) => {
        member.email = await fetchProfileEmail(member.profile_url);
      })
    );

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Music: ${err.message}`);
    return [];
  }
}
