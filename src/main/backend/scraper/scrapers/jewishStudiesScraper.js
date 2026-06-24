import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Jewish Studies people page.
 *
 * Like CCS, people are rendered as an HTML table (`tbody tr`), but each row has
 * only two cells: a photo cell and a single combined cell whose classes stack
 * several view fields (`views-field-title views-field-field-title
 * views-field-field-subtitle views-field-field-email`). Inside that cell the
 * fields are laid out as `<a>name</a><br>Title<br>Subtitle<br><a mailto>email`,
 * so the name and email come from the cell's anchors and the title/subtitle are
 * the plain-text `<br>`-separated lines between them.
 *
 * @param {string} url - Full URL of the people page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeJewishStudiesFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('tbody tr').each((_, tr) => {
      const $tr = $(tr);

      // The name is the first (non-mailto) anchor in the combined info cell.
      const nameElem = $tr
        .find('td.views-field-title a')
        .not('[href^="mailto:"]')
        .first();
      const name = getText(nameElem);
      if (!name) return; // skip header/empty rows

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const emailElem = $tr.find('a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      // The info cell reads "Name<br>Title<br>Subtitle<br>email". Split on the
      // <br> tags (replaced with newlines) and drop the name/email lines so the
      // remaining lines are the job title and affiliated subtitle department.
      const $cell = $tr.find('td.views-field-title').first();
      const lines = $cell
        .html()
        ?.replace(/<br\s*\/?>/gi, '\n')
        .split('\n')
        .map((part) => load(`<div>${part}</div>`)('div').text().replace(/\s+/g, ' ').trim())
        .filter((line) => line && line !== name && line !== email) || [];

      const title = lines[0] || null;
      // A second text line, when present, is the person's affiliated department.
      const specialization = lines[1] || null;

      let photoUrl = $tr.find('td.views-field-field-photo img').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization,
        email,
        phone: null,           // Not available on this page
        office: null,          // Not available on this page
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,   // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Jewish Studies: ${err.message}`);
    return [];
  }
}
