// englishScraper.js
import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scraper for UCSB English department faculty list.
 * @param {string} url - URL of the UCSB English faculty page
 * @param {string} departmentName - e.g. "English"
 * @returns {Promise<Array<Object>>}
 */
export async function scrapeEnglishFaculty(url, departmentName = 'English') {
  const res = await axios.get(url);
  const $ = load(res.data);
  const facultyData = [];

  $('li.table--list--row').each((_, block) => {
    const $block = $(block);

    // Skip header rows
    if ($block.hasClass('table--head')) return;

    const flexTable = $block.find('div.flex--table');
    if (!flexTable.length) return;

    const nameElem = flexTable.find('div.table--name a');
    if (!nameElem.length) return;

    const name = nameElem.text().trim();
    let profileUrl = nameElem.attr('href') || '';
    if (profileUrl && !profileUrl.startsWith('http')) {
      profileUrl = 'https://www.english.ucsb.edu' + profileUrl;
    }

    const title = flexTable.find('div.table--position').text().trim() || null;

    const contactElem = flexTable.find('div.table--desc');
    let office = null;
    let email = null;
    if (contactElem.length) {
      const contents = contactElem.contents();
      if (contents.length > 0 && contents[0].type === 'text') {
        office = contents[0].data.trim();
      }
      const emailElem = contactElem.find('a');
      if (emailElem.length) {
        email = emailElem.text().trim();
      }
    }

    const photoElem = flexTable.find('div.img-portrait-archive img');
    let photoUrl = null;
    if (photoElem.length) {
      photoUrl = photoElem.attr('src');
      if (photoUrl && !photoUrl.startsWith('http')) {
        photoUrl = 'https://www.english.ucsb.edu' + photoUrl;
      }
    }

    const rawAreas = $block.attr('data-category') || '';
    const researchAreas = rawAreas.split(' ').map(tag =>
      tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    ).filter(area => area.length > 0);
    const specialization = researchAreas.join(', ') || null;

    facultyData.push({
      name,
      title,
      specialization,
      email,
      phone: null,
      office,
      website: profileUrl,
      photo_url: photoUrl,
      research_areas: researchAreas,
      department: departmentName,
      profile_url: profileUrl
    });
  });

  return facultyData;
}
