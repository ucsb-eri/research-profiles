import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Statistics & Applied Probability (PSTAT) faculty page.
 *
 * A Drupal layout where each `div.views-row` wraps an `article.people-profile`.
 * The name lives in `h4 strong a`, the photo in the leading `img`, and the
 * remaining details are loose `<p>` tags: an `<h6>` holds pronouns, the first
 * plain `<p>` is the title, and `p.break-words` carries the `mailto:` email.
 * Phone/office/specialization are not listed.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapePstatFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('article.people-profile').each((_, article) => {
      const $article = $(article);

      const nameElem = $article.find('h4 strong a, h4 a').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      // The first plain <p> that isn't the email line holds the title.
      let title = null;
      $article.find('p').each((_, p) => {
        const $p = $(p);
        if ($p.find('a[href^="mailto:"]').length) return;
        const text = getText($p);
        if (text && !title) title = text;
      });

      const emailElem = $article.find('a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $article.find('img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email,
        phone: null,          // Not available on this page
        office: null,          // Not available on this page
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,  // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping PSTAT: ${err.message}`);
    return [];
  }
}
