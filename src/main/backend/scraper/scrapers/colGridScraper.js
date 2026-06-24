import axios from 'axios';
import { load } from 'cheerio';

// Many UCSB Drupal "people" pages render a full directory (faculty + grad
// students + staff) as `div.col-lg-4` cards. The card already shows the role in
// `views-field-field-title`, so we filter to faculty here rather than fetching
// every profile. A title is faculty if it names a professorial/lecturer/emeritus
// rank, or is exactly the category label "Faculty"/"Affiliated Faculty"/
// "Emeriti" (some departments, e.g. Math, label cards by category instead of
// rank). Grad students ("Graduate Student", "Ph.D. Candidate") and staff never
// match, while faculty with admin roles ("Professor, Director of Graduate
// Studies") still do.
const isFacultyTitle = (title) => {
  const s = (title || '').trim();
  return /professor|lecturer|emerit/i.test(s) ||
    /^(affiliated\s+)?faculty$/i.test(s) ||
    /^emeriti$/i.test(s);
};

// Pull an email from a profile page: prefer a mailto: link, fall back to plain
// text. Scoped to the profile article so we never grab a department/footer
// address. (Some profiles print the address as text rather than a link.)
async function fetchProfileEmail(profileUrl) {
  if (!profileUrl) return null;
  try {
    const $ = load((await axios.get(profileUrl)).data);
    const $article = $('article.people-profile');
    const href =
      $article.find('a[href^="mailto:"]').first().attr('href') ||
      $('a[href^="mailto:"]').first().attr('href');
    if (href) {
      return decodeURIComponent(href.replace(/^mailto:/i, '').split('?')[0]).trim() || null;
    }
    const match = ($article.length ? $article : $('body')).text().match(/[\w.+-]+@[\w.-]+\.\w+/);
    return match ? match[0] : null;
  } catch (err) {
    console.error(`  Could not fetch email from ${profileUrl}: ${err.message}`);
    return null;
  }
}

// Enrich members with profile emails in small batches to stay polite to the
// source server rather than firing all requests at once.
async function enrichEmails(members, batchSize = 6) {
  for (let i = 0; i < members.length; i += batchSize) {
    const batch = members.slice(i, i + batchSize);
    await Promise.all(batch.map(async (m) => { m.email = await fetchProfileEmail(m.profile_url); }));
  }
}

/**
 * Scrapes a UCSB Drupal `div.col-lg-4` directory page, filtered to faculty.
 *
 * Shared by departments whose /people page lists everyone in card form
 * (Chemistry, Mathematics, Philosophy, Political Science, Sociology,
 * Linguistics, Global Studies, Comparative Literature, History of Art). The
 * card carries name, title, and office; email is fetched from each faculty
 * member's profile page.
 *
 * @param {string} url - Full URL of the people page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeColGridFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const baseUrl = new URL(url).origin;
    const getText = (el) =>
      el && el.length ? $(el).text().replace(/\s+/g, ' ').trim() || null : null;

    $('div.col-lg-4').each((_, card) => {
      const $card = $(card);

      const nameElem = $card.find('div.views-field-nothing h3 a, h3 a').first();
      const name = getText(nameElem);
      if (!name) return;

      const title = getText($card.find('div.views-field-field-title').first());
      if (!isFacultyTitle(title)) return; // skip grad students / staff

      let profileUrl = nameElem.attr('href') || null;
      if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

      const office = getText(
        $card.find('div.views-field-field-address span.field-content').first()
      );

      let photoUrl = $card.find('div.views-field-field-photo img').first().attr('src') || null;
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

    await enrichEmails(facultyData);
    return facultyData;
  } catch (err) {
    console.error(`Error scraping col-grid page (${department}): ${err.message}`);
    return [];
  }
}
