import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB History department faculty page.
 *
 * This is a WordPress custom layout rather than Drupal: each person is a
 * `div.faculty_card` holding `a.faculty_name` (name, "Last, First"),
 * `label.faculty_title` (title), `label.faculty_office` (office, prefixed with
 * "Office:"), `a.faculty_email` (email), and `img.faculty_image` (photo). Photo
 * and profile URLs are already absolute. Specialization/phone are not listed.
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeHistoryFaculty(url, department) {
  try {
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.faculty_card').each((_, card) => {
      const $card = $(card);

      const nameElem = $card.find('a.faculty_name').first();
      const name = getText(nameElem);
      if (!name) return;

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const title = getText($card.find('label.faculty_title').first());

      // Office is prefixed with an "Office:" label inside the same element.
      let office = getText($card.find('label.faculty_office').first());
      if (office) office = office.replace(/^office:\s*/i, '') || null;

      const emailElem = $card.find('a.faculty_email[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $card.find('img.faculty_image').first().attr('src') || null;
      if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email,
        phone: null,          // Not available on this page
        office,
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,  // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping History: ${err.message}`);
    return [];
  }
}
