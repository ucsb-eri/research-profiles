import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Germanic and Slavic Studies faculty page.
 *
 * Each person is rendered as a `div.columns` holding two paragraph columns: a
 * `col-md-3` with the headshot and a `col-md-9` with a `field-body` text blob.
 * The body opens with an `<h2>` formatted as "Name, Title" and then mixes
 * labelled fields ("Office:", "Email:", "Interests:") into loose paragraph
 * text. Name/title are split on the first comma; office, email, and interests
 * are read by walking the labelled `<strong>` runs. Email is on the listing.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeGSSFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const clean = (s) => (s ? s.replace(/\s+/g, ' ').trim() || null : null);

    $('div.columns').each((_, group) => {
      const $group = $(group);

      const $body = $group.find('div.field--name-field-body').first();
      if (!$body.length) return;

      const heading = clean($body.find('h2').first().text());
      if (!heading) return;

      // "Name, Title" -> split on the first comma.
      const commaIdx = heading.indexOf(',');
      const name = commaIdx >= 0 ? heading.slice(0, commaIdx).trim() : heading;
      const title = commaIdx >= 0 ? heading.slice(commaIdx + 1).trim() || null : null;
      if (!name) return;

      // Photo lives in the sibling icon column of this group.
      let photoUrl = $group.find('div.column-icon img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      // Walk the labelled <strong> runs to pull office and interests.
      const valueAfterLabel = (label) => {
        let value = null;
        $body.find('strong').each((_, s) => {
          const lbl = $(s).text().replace(/[:\s]+$/, '').trim().toLowerCase();
          if (lbl === label.toLowerCase()) {
            let node = s.nextSibling;
            let acc = '';
            // Collect following text/inline nodes until the next <strong> or <br>.
            while (node) {
              if (node.type === 'tag' && (node.name === 'strong' || node.name === 'br')) break;
              if (node.type === 'text') acc += node.data;
              else if (node.type === 'tag') acc += $(node).text();
              node = node.nextSibling;
            }
            const t = clean(acc.replace(/^[:\s]+/, ''));
            if (t) value = t;
          }
        });
        return value;
      };

      const office = valueAfterLabel('Office');
      const research_areas = valueAfterLabel('Interests');

      const emailElem = $body.find('a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      // The "More" button links to the person's profile page.
      let profileUrl = $body.find('a.ucsb-button').first().attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      facultyData.push({
        name,
        title,
        specialization: null,  // Not available on this page
        email,
        phone: null,           // Not available on this page
        office,
        website: profileUrl,
        photo_url: photoUrl,
        research_areas,
        department,
        profile_url: profileUrl,
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Germanic and Slavic Studies: ${err.message}`);
    return [];
  }
}
