import axios from 'axios';

// The Gevirtz School faculty listing is JS-rendered: the page ships empty
// placeholders that its muster.faculty-listing.js fills by querying a "muster"
// JSONP service. We query that same service directly. The DB groups people into
// faculty-listing categories; we keep the two that are actually faculty and drop
// Researchers, matching what the site renders as faculty.
const MUSTER_URL = 'https://muster.education.ucsb.edu/muster/';
const FACULTY_CATEGORIES = new Set([
  'Academic Senate Faculty',
  'Lecturer-Academic Coordinator-Teacher Supervisor',
]);

/**
 * Scrapes the UCSB Gevirtz Graduate School of Education faculty listing.
 *
 * Rather than the (empty) static HTML, this hits the muster JSONP data service
 * the page's JavaScript uses, replicating its select/join query. Name, title,
 * email, phone, department and research emphases come straight from the service;
 * the profile-page link and photo URL are derived from the same templates the
 * site's JS uses.
 *
 * @param {string} url - Full URL of the faculty page (used for its origin).
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeEducationFaculty(url, department) {
  try {
    const baseUrl = new URL(url).origin;

    const params = {
      database: 'ggsedb',
      select: [
        'first_name',
        'last_name',
        'display_name',
        'profile.title',
        'profile.working_title',
        'profile.email',
        'profile.phone',
        'emphasis_type_1.name as emphasis1',
        'emphasis_type_2.name as emphasis2',
        'emphasis_type_3.name as emphasis3',
        'department_1.acronym as department1',
        'department_2.acronym as department2',
        'profile.faculty_listing_category',
      ].join(','),
      from: [
        'profile',
        'emphasis on emphasis.profile_id = profile.id',
        'emphasis_type_1 on emphasis.emphasis_type_id_1 = emphasis_type_1.id',
        'emphasis_type_2 on emphasis.emphasis_type_id_2 = emphasis_type_2.id',
        'emphasis_type_3 on emphasis.emphasis_type_id_3 = emphasis_type_3.id',
        'department_1 on profile.department1_id = department_1.id',
        'department_2 on profile.department2_id = department_2.id',
      ].join(' left join '),
      where: "profile.active = 'yes'",
      order: 'last_name asc',
      callback: 'cb',
    };

    const res = await axios.get(MUSTER_URL, {
      params,
      headers: { 'User-Agent': 'Mozilla/5.0' },
      responseType: 'text',
    });

    // The response is JSONP: cb({...}). Strip the callback wrapper to parse it.
    const body = String(res.data).trim();
    const json = body.slice(body.indexOf('(') + 1, body.lastIndexOf(')'));
    const data = JSON.parse(json);

    const facultyData = [];
    for (const row of data.results || []) {
      if (!FACULTY_CATEGORIES.has(row.faculty_listing_category)) continue;

      const first = (row.first_name || '').trim();
      const last = (row.last_name || '').trim();
      const name = (row.display_name || `${first} ${last}`).replace(/\s+/g, ' ').trim();
      if (!name) continue;

      // The site shows the working title where available, else the base title.
      const title = (row.working_title || row.title || '').replace(/\s+/g, ' ').trim() || null;

      const research = [row.emphasis1, row.emphasis2, row.emphasis3]
        .map((e) => (e || '').trim())
        .filter(Boolean);
      const researchAreas = research.length ? research.join(', ') : null;

      const departments = [row.department1, row.department2]
        .map((d) => (d || '').trim())
        .filter(Boolean);
      const specialization = departments.length ? departments.join(', ') : null;

      const email = (row.email || '').trim() || null;
      const phone = (row.phone || '').trim() || null;

      // Profile + photo URLs follow the templates in muster.faculty-listing.js.
      const profileUrl =
        first && last
          ? `${baseUrl}/research-faculty/bio?first=${encodeURIComponent(first)}&last=${encodeURIComponent(last)}`
          : null;
      const photoSlug = (first + last).toLowerCase().replace(/[^a-z]/g, '');
      const photoUrl = photoSlug
        ? `${baseUrl}/sites/default/files/images/people/${photoSlug}.jpg`
        : null;

      facultyData.push({
        name,
        title,
        specialization,
        email,
        phone,
        office: null,          // Not available from the service
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: researchAreas,
        department,
        profile_url: profileUrl,
      });
    }

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Gevirtz School of Education: ${err.message}`);
    return [];
  }
}
