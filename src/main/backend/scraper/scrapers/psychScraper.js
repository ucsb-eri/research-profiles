import axios from 'axios';
import { load } from 'cheerio';

// Psychology renders its full directory as a table; the person's role is encoded
// in the profile-link path (/people/faculty/..., /people/emeriti/...,
// /people/graduate-students/..., etc.), so we keep only faculty and emeriti.
const FACULTY_PATH = /\/people\/(faculty|emeriti)\//i;

async function fetchProfileEmail(profileUrl) {
  if (!profileUrl) return null;
  try {
    const $ = load((await axios.get(profileUrl)).data);
    const $article = $('article.people-profile');
    const href =
      $article.find('a[href^="mailto:"]').first().attr('href') ||
      $('a[href^="mailto:"]').first().attr('href');
    if (href) return decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).trim() || null;
    const match = ($article.length ? $article : $('body')).text().match(/[\w.+-]+@[\w.-]+\.\w+/);
    return match ? match[0] : null;
  } catch (err) {
    console.error(`  Could not fetch email from ${profileUrl}: ${err.message}`);
    return null;
  }
}

async function enrichEmails(members, batchSize = 6) {
  for (let i = 0; i < members.length; i += batchSize) {
    await Promise.all(members.slice(i, i + batchSize).map(async (m) => {
      m.email = await fetchProfileEmail(m.profile_url);
    }));
  }
}

/**
 * Scrapes the UCSB Psychological & Brain Sciences people page, faculty + emeriti.
 *
 * Table layout (`tr.rev--people--row`) with the role in the profile-link path.
 * The listing has the name, role, and lab link; email comes from each person's
 * profile page.
 *
 * @param {string} url - Full URL of the people page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapePsychFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('tr.rev--people--row').each((_, row) => {
      const $row = $(row);

      const nameElem = $row.find('h2 a').first();
      const name = getText(nameElem);
      const href = nameElem.attr('href') || '';
      if (!name || !FACULTY_PATH.test(href)) return; // keep faculty + emeriti only

      let profileUrl = href;
      if (profileUrl.startsWith('/')) profileUrl = baseUrl + profileUrl;

      // First <p> after the name is the role/title.
      const title = getText($row.find('h2').first().nextAll('p').first());

      facultyData.push({
        name,
        title,
        specialization: null, // Not available on this page
        email: null,          // Filled in below from the profile page
        phone: null,          // Not available on this page
        office: null,          // Not available on this page
        website: profileUrl,
        photo_url: null,        // Not available on this page
        research_areas: null,   // Not available on this page
        department,
        profile_url: profileUrl,
      });
    });

    await enrichEmails(facultyData);
    return facultyData;
  } catch (err) {
    console.error(`Error scraping Psychological & Brain Sciences: ${err.message}`);
    return [];
  }
}
