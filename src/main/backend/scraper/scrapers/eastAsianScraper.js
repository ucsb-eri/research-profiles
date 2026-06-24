import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB East Asian Languages & Cultural Studies faculty page.
 *
 * This is a WordPress directory rather than a Drupal layout: each person is a
 * `div.card.dir-card`. The source markup nests an `<h5>` inside an `<a>`, which
 * the HTML parser rewrites, so in the parsed DOM the name lives in
 * `h5.card-title a.directory-name`, the job title is the loose text node right
 * after the `</h5>`, and `<b>` labels (Area, Office, Email) follow as direct
 * children of `card-details`. The photo is a lazy-loaded `img.dir-img` whose
 * real source lives in `data-src`. "Area" is stored as specialization. Email is
 * on the listing page.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeEastAsianFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    // The card body mixes labelled fields ("Area:", "Office:", "Email:") into
    // a single run of text/<br> nodes. Pull the value that follows a label.
    const valueAfterLabel = ($body, label) => {
      let value = null;
      $body.find('b').each((_, b) => {
        if ($(b).text().trim().toLowerCase().startsWith(label.toLowerCase())) {
          // The label's value is the text node immediately following the <b>.
          const next = b.nextSibling;
          if (next && next.type === 'text') {
            const t = next.data.replace(/\s+/g, ' ').trim();
            if (t) value = t;
          }
        }
      });
      return value;
    };

    $('div.card.dir-card').each((_, card) => {
      const $card = $(card);
      const $body = $card.find('div.card-details').first();

      const $heading = $body.find('h5.card-title').first();
      const nameElem = $heading.find('a.directory-name').first();
      const name = getText(nameElem) || getText($heading);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      // The job title is the loose text node(s) right after the </h5> and before
      // the first labelled <b>.
      let title = null;
      let node = $heading.get(0)?.nextSibling;
      let acc = '';
      while (node) {
        if (node.type === 'tag' && node.name === 'b') break;
        if (node.type === 'text') acc += node.data;
        node = node.nextSibling;
      }
      title = acc.replace(/\s+/g, ' ').trim() || null;

      const specialization = valueAfterLabel($body, 'Area');
      const office = valueAfterLabel($body, 'Office');

      const emailElem = $body.find('a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl =
        $card.find('img.dir-img').first().attr('data-src') ||
        $card.find('img.dir-img').first().attr('src') ||
        null;
      if (photoUrl?.startsWith('data:')) photoUrl = null; // placeholder SVG
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization,
        email,
        phone: null,           // Not available on this page
        office,
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,   // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping East Asian Languages & Cultural Studies: ${err.message}`);
    return [];
  }
}
