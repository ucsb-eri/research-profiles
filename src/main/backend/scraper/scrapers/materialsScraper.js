import axios from 'axios';
import { load } from 'cheerio';

// The Materials "faculty" page actually lists everyone — faculty, grad
// students, postdocs, and staff (~250 people). We keep only those whose role
// reads as faculty so the directory isn't flooded with non-faculty entries.
const FACULTY_TITLE = /\b(professor|lecturer|emerit(us|a)?)\b/i;

/**
 * Scrapes the UCSB Materials department people page, filtered to faculty.
 *
 * Each person is a `<li>` with `div.views-field-*` fields. The role lives in
 * `views-field-field-titles--departments` and is used both as the title and to
 * filter out grad students / postdocs / staff (see FACULTY_TITLE).
 *
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeMaterialsFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('li').each((_, li) => {
      const $li = $(li);

      const nameElem = $li.find('div.views-field-title span.field-content a').first();
      const name = getText(nameElem);
      if (!name) return;

      const title = getText($li.find('div.views-field-field-titles--departments div.field-content').first());
      if (!FACULTY_TITLE.test(title || '')) return; // skip non-faculty

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const emailElem = $li.find('div.views-field-field-people-email a[href^="mailto:"]').first();
      const email = emailElem.length
        ? decodeURIComponent(emailElem.attr('href').replace(/^mailto:/i, '').split('?')[0]).trim() || null
        : null;

      let photoUrl = $li.find('div.views-field-field-image img').first().attr('src') || null;
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
    console.error(`Error scraping Materials: ${err.message}`);
    return [];
  }
}
