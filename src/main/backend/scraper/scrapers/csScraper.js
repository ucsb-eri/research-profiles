import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scrape UCSB Computer Science department faculty data
 * @param {string} url - The full URL of the CS department faculty page
 * @param {string} department - The name of the department (e.g., "Computer Science")
 * @returns {Promise<Array<Object>>} - List of faculty info
 */
export async function scrapeCSFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];

    $('div.views-row div.views-field-nothing span.field-content > div').each((_, el) => {
      const $block = $(el);
      const divs = $block.find('div');

      if (divs.length < 2) return;
      const infoDiv = divs.eq(1);

      const nameElem = infoDiv.find('h2 a');
      if (!nameElem.length) return;

      const name = nameElem.text().trim();
      let profileUrl = nameElem.attr('href') || '';
      if (profileUrl.startsWith('/')) {
        profileUrl = `https://www.cs.ucsb.edu${profileUrl}`;
      }

      const paragraphs = infoDiv.find('p');
      let title = null,
        specialization = null,
        email = null,
        phone = null,
        office = null,
        website = null;

      paragraphs.each((i, p) => {
        const text = $(p).text().trim();
        const link = $(p).find('a');

        if (i === 0 && !/He\/Him|She\/Her/.test(text)) {
          title = text;
        } else if ((i === 1 || (i === 2 && !title)) && !specialization) {
          if (!title) title = text;
          else specialization = text;
        } else if (/@/.test(text)) {
          email = link.length ? link.text().trim() : null;
        } else if (link.length && /Personal Website|Google Scholar/.test(text)) {
          website = link.attr('href');
        } else if (/Hall/.test(text)) {
          office = text;
        } else if (!link.length && /\d{3}[-.]\d{3}[-.]\d{4}/.test(text)) {
          phone = text;
        }
      });

      facultyData.push({
        name,
        title,
        specialization,
        email,
        phone,
        office,
        website: website || profileUrl,
        photo_url: null,
        research_areas: null, // Not available on this page
        department: department,
        profile_url: profileUrl
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping Computer Science: ${err.message}`);
    return [];
  }
}
