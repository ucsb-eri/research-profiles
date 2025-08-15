
import axios from 'axios';
import { load } from 'cheerio';

/**
 * Generic scraper for UCSB Drupal-based department faculty pages.
 * @param {string} url - Full faculty page URL
 * @param {string} departmentName - Name of the department for labeling
 * @returns {Promise<Array<Object>>} - Array of faculty objects
 */
export async function scrapeDrupalGeneral(url, departmentName) {
  const res = await axios.get(url);
  const $ = load(res.data); //
  const facultyData = [];

  const baseUrl = new URL(url).origin;

  $('div.views-row').each((_, row) => {
    const $row = $(row);
    const getText = (selector) => $row.find(selector).first().text().trim() || null;

    const nameElem = $row.find(
      'div.views-field-title span.field-content a, h2 a, div.table--name a'
    ).first();
    if (!nameElem.length) return;

    const name = nameElem.text().trim();
    let profileUrl = nameElem.attr('href') || null;
    if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

    const title =
      getText('div.views-field-field-affiliation div.field-content') ||
      getText('div.table--position') ||
      getText('p:nth-of-type(1)');

    const specialization = getText('div.views-field-field-specialization div.field-content');

    const emailElem = $row.find('div.views-field-field-contact-email a, a[href^="mailto:"]').first();
    const email = emailElem.length ? emailElem.text().trim() : null;

    const phone = getText('div.views-field-field-contact-phone div.field-content');
    const office = getText('div.views-field-field-office-location div.field-content');

    const websiteElem = $row.find(
      'div.views-field-field-website div.field-content a, a[href*="http"]:not([href^="mailto:"])'
    ).first();
    const websiteRaw = websiteElem.attr('href') || '';
    const website = websiteRaw.includes('mailto:') ? profileUrl : websiteRaw || profileUrl;

    const photoElem = $row.find(
      'div.views-field-field-photo img, img.image-style-people-view, div.table--portrait img, img'
    ).first();
    const photoUrl = photoElem.attr('src') || null;

    facultyData.push({
      name,
      title,
      specialization,
      email,
      phone,
      office,
      website,
      photo_url: photoUrl,
      research_areas: null, // Placeholder for research areas if needed
      department: departmentName,
      profile_url: profileUrl,
    });
  });

  return facultyData;
}

