import axios from 'axios';
import {load} from 'cheerio';

async function scrapeArtFaculty(baseUrl = 'https://www.arts.ucsb.edu/faculty/') {
  const res = await axios.get(baseUrl);
  const $ = load(res.data);
  const faculty = [];

  $('p').each((_, el) => {
    const textContent = $(el).text().trim();
    const lines = textContent.split('\n').map(line => line.trim()).filter(Boolean);
    const links = $(el).find('a');

    const hasFacultyKeywords = /Professor|Lecturer|Teaching/.test(textContent);

    if (links.length && hasFacultyKeywords) {
      const name = $(links[0]).text().trim();
      let website = $(links[0]).attr('href') || null;

      // Fix relative URLs
      if (website && !website.startsWith('http')) {
        website = baseUrl.replace(/\/+$/, '') + '/' + website.replace(/^\/+/, '');
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
          title = line;
          // Remove anything in parentheses as specialization
          const specMatch = line.match(/\((.*?)\)/);
          specialization = specMatch ? specMatch[1] : null;
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

      faculty.push({
        name,
        title,
        specialization,
        email,
        phone,
        office,
        website,
        photo_url: null, // Not available on this page
        department: 'Art'
      });
    }
  });

  return faculty;
}

export default scrapeArtFaculty;