import axios from 'axios';
import {load} from 'cheerio';


/**
 * Generic scraper for UCSB departments using Drupal directory layout.
 * @param {string} url - Full URL to the department faculty page
 * @param {string} departmentName - Department name to label entries
 * @returns {Promise<Array<Object>>}
 */

async function artScraper(url, departmentName) {
  const res = await axios.get(url);
  const $ = load(res.data);
  const faculty = [];

  $('p').each((_, el) => {
    const textContent = $(el).text().trim();
    const lines = textContent.split('\n').map(line => line.trim()).filter(Boolean);
    const links = $(el).find('a');

    const hasFacultyKeywords = /Professor|Lecturer|Teaching/.test(textContent);

    if (links.length && hasFacultyKeywords) {
        let name;
        if ($(links[0]).text().trim() !== 'moulton@arts.ucsb.edu') {
  name = $(links[0]).text().trim();
        } else {
            name = "Shana Moulton"; // Special case for Moulton
        }
    
      let website = $(links[0]).attr('href') || null;

      // Fix relative URLs
      if (website && !website.startsWith('http')) {
        website = url.replace(/\/+$/, '') + '/' + website.replace(/^\/+/, '');
      }
      if (website && !website.endsWith('/')) website += '/';

      // Attempt to find email
      const html = $.html(el);
      const emailMatch = html.match(/mailto:([^\"]+)/);
      let email = emailMatch ? decodeURIComponent(emailMatch[1]) : null;

      // Extract fields from lines
      let title = null;
      let specialization = null;
      let office = null;
      let phone = null;

      for (let line of lines.slice(1)) {
        if (line.includes('Professor')) {
          // Extract specialization inside parentheses
            const specMatch = line.match(/\((.*?)\)/);
            specialization = specMatch ? specMatch[1] : null;

            // Remove the parentheses and content from the title
            title = line.replace(/\s*\(.*?\)\s*/g, '').trim();
        } else if (line.includes('@') && !email) {
          email = line;
        } else if (/Arts|Elings/.test(line)) {
          office = line;
        } else if (/[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)) {
          phone = line;
        } else if (!specialization) {
          specialization = line;
        }
      }
      // Special case for Moulton (weird HTML formatting)
      if (email=='moulton@arts.ucsb.edu'){
        title = "Professor";
        specialization = "Video, Performance, Installation";
        website = "https://www.arts.ucsb.edu/faculty/moulton/";
      }

      faculty.push({
        name,
        title,
        specialization,
        email,
        phone,
        office,
        website,
        photo_url: null, // Not available on this page
        research_areas: null,
        department: departmentName,
        profile_url: null
      });
    }
  });

  return faculty;
}

export default artScraper;