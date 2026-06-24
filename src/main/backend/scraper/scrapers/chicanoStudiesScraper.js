import axios from 'axios';
import { load } from 'cheerio';

/**
 * Fetches a single Chicana/o Studies profile page and extracts the email.
 *
 * The listing only exposes name/title/office/photo, so we follow each profile
 * link and read the `mailto:` link from the profile article.
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
 * Scrapes the UCSB Chicana and Chicano Studies people page.
 *
 * The page is a Bootstrap-style grid where each person is a
 * `div.col-lg-4.col-md-4.col-sm-6` cell containing the photo
 * (`views-field-field-photo`), the name/profile link
 * (`views-field-nothing h3 a`), the title (`views-field-field-title h4`), and an
 * optional office (`views-field-field-address span.field-content`). Email is not
 * on the listing and is pulled from each person's profile page.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeChicanoStudiesFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.col-lg-4.col-md-4.col-sm-6').each((_, item) => {
      const $item = $(item);

      const nameElem = $item.find('div.views-field-nothing h3 a').first();
      const name = getText(nameElem);
      if (!name) return; // skip non-person cells

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($item.find('div.views-field-field-title').first());

      // The address field prefixes an "Office Location:" label, so read only the
      // value span.
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

    // Enrich each person with the email from their profile page.
    await Promise.all(
      facultyData.map(async (member) => {
        member.email = await fetchProfileEmail(member.profile_url);
      })
    );

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Chicana and Chicano Studies: ${err.message}`);
    return [];
  }
}
