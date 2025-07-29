import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrapes the UCSB Anthropology department - style page.
 * @param {string} url - Full URL of the faculty page.
 * @param {string} department - Name of the department.
 * @returns {Promise<Array<Object>>} List of faculty data objects.
 */
export async function scrapeAnthropologyFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    const getText = (el) =>
      el ? $(el).text().replace(/\n+/g, ' ').trim() : null;

    $('div.views-row').each((_, row) => {
      const name = getText($(row).find('div.views-field-title span.field-content a'));
      const title = getText($(row).find('div.views-field-field-affiliation div.field-content'));
      const specialization = getText($(row).find('div.views-field-field-specialization div.field-content'));
      const email = getText($(row).find('div.views-field-field-contact-email a'));
      const phone = getText($(row).find('div.views-field-field-contact-phone div.field-content'));
      const office = getText($(row).find('div.views-field-field-office-location div.field-content'));

      const websiteTag = $(row).find('div.views-field-field-website a');
      const website = websiteTag.attr('href') || null;

      const photoTag = $(row).find('div.views-field-field-photo img');
      const photoUrl = photoTag.attr('src') || null;

      facultyData.push({
        name,
        title,
        specialization,
        email,
        phone,
        office,
        website,
        photo_url: photoUrl,
        research_areas: null, // Not available on this page
        department: department,
        profile_url: website // Use website as profile URL
        
      });
    });

    return facultyData;
  } catch (err) {
    console.error(` Error scraping Anthropology: ${err.message}`);
    return [];
  }
}
