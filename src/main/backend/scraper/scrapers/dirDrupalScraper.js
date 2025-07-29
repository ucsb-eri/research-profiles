import axios from 'axios';
import { load } from 'cheerio';
import { URL } from 'url';

/**
 * Generic scraper for UCSB departments using Drupal directory layout.
 * @param {string} url - Full URL to the department faculty page
 * @param {string} departmentName - Department name to label entries
 * @returns {Promise<Array<Object>>}
 */
export async function scrapeDrupalDirectory(url, departmentName) {
  const res = await axios.get(url);
  const $ = load(res.data);
  const facultyData = [];

  const baseUrl = new URL(url).origin;

  $('div.view-content div.views-row').each((_, el) => {
    const $block = $(el);

    const first = $block.find('div.group-first');
    const second = $block.find('div.group-second');
    const third = $block.find('div.group-third');
    const fourth = $block.find('div.group-fourth');

    if (!second.length) return;

    const nameElem = second.find('h3 a');
    if (!nameElem.length) return;

    const name = nameElem.text().trim();
    let profileUrl = nameElem.attr('href');
    if (profileUrl?.startsWith('/')) profileUrl = baseUrl + profileUrl;

    // Title extraction
    let title = null;
    const h3 = second.find('h3');
    let current = h3[0]?.nextSibling;
    while (current && (!current.name || current.name !== 'span')) {
      if (current.type === 'text') title = (title || '') + current.data;
      current = current.nextSibling;
    }
    title = title?.trim();

    // Office
    let office = null;
    const iconSpan = second.find('span.directory-fa-icons').first();
    if (iconSpan.length) {
      let officeText = '';
      let sibling = iconSpan[0]?.nextSibling;
      while (sibling) {
        if (sibling.type === 'text') officeText += sibling.data;
        sibling = sibling.nextSibling;
      }
      const match = officeText.match(/(?:Webb|South|[A-Za-z]+)\s+Hall\s+\d+\w*/);
      if (match) office = match[0];
    }

    // Specialization
    const specialization = third.text().trim() || null;

    // Email, phone, website
    const email = iconSpan.find('a[title*="Email"]').attr('title')?.match(/[\w\.-]+@[\w\.-]+/)?.[0] || null;
    const phone = iconSpan.find('a[title*="Phone"]').attr('title')?.replace(/Phone:/, '').trim() || null;
    const website = iconSpan.find('a[title*="Website"]').attr('href') || profileUrl;

    // Photo
    let photoUrl = first.find('img').attr('data-src') || first.find('img').attr('src') || null;
    if (photoUrl?.startsWith('/')) photoUrl = baseUrl + photoUrl;

    // Research areas
    const researchAreas = fourth.find('a').map((_, a) => $(a).text().trim()).get();
    const researchAreaText = researchAreas.length ? researchAreas.join(', ') : null;

    facultyData.push({
      name,
      title,
      specialization,
      email,
      phone,
      office,
      website,
      photo_url: photoUrl,
      research_areas: researchAreaText,
      department: departmentName,
      profile_url: profileUrl
    });
  });

  return facultyData;
}
