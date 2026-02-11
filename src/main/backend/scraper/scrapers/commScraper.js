import axios from "axios";
import { load } from "cheerio";

/**
 * Scrape UCSB Communication Department faculty
 * @param {string} url - e.g. "https://www.comm.ucsb.edu/people/faculty"
 * @param {string} department - e.g. "Communication"
 * @returns {Promise<Array<Object>>}
 */
export async function scrapeCommFaculty(url, department) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const faculty = [];
    const baseUrl = new URL(url).origin;

    // The page structure shows faculty cards with:
    // - An image link with <a><img></a>
    // - An h3 with name link <h3><a href="/people/...">Name</a></h3>
    // - Title text directly after the h3
    
    // Find all faculty profile links in h3 tags
    $('h3 a[href^="/people/"]').each((_, elem) => {
      const $link = $(elem);
      const name = $link.text().trim();
      const profileUrl = baseUrl + $link.attr('href');
      
      // Get the parent container to find other info
      const $container = $link.closest('div').parent();
      
      // Find the title - it's typically the next text node or sibling element after h3
      let title = null;
      const $h3 = $link.closest('h3');
      
      // Try to find title in next siblings
      $h3.nextAll().each((_, sibling) => {
        const text = $(sibling).text().trim();
        if (text && !title) {
          // Check if it looks like a title (not a name or link)
          if (text.includes('Professor') || 
              text.includes('Lecturer') || 
              text.includes('Chair') ||
              text.includes('Director') ||
              text.includes('Dean') ||
              text.includes('Emerit') ||
              text.includes('Associate') ||
              text.includes('Assistant')) {
            title = text.replace(/\s+/g, ' ');
          }
        }
      });
      
      // Also check for title in the same container as text nodes
      if (!title) {
        const containerText = $container.text();
        const lines = containerText.split('\n').map(l => l.trim()).filter(Boolean);
        // Title is usually right after the name
        const nameIndex = lines.findIndex(l => l === name);
        if (nameIndex >= 0 && nameIndex < lines.length - 1) {
          const potentialTitle = lines[nameIndex + 1];
          if (potentialTitle && potentialTitle !== name) {
            title = potentialTitle.replace(/\s+/g, ' ');
          }
        }
      }
      
      // Find photo - look for image in the same container
      let photoUrl = null;
      const $img = $container.find('img').first();
      if ($img.length) {
        photoUrl = $img.attr('src');
        if (photoUrl && photoUrl.startsWith('/')) {
          photoUrl = baseUrl + photoUrl;
        }
      }
      
      console.log(`Extracted: ${name} - ${title || 'no title'}`);
      
      faculty.push({
        name,
        title,
        specialization: null,
        email: null,
        phone: null,
        office: null,
        website: profileUrl,
        photo_url: photoUrl,
        research_areas: null,
        department,
        profile_url: profileUrl,
      });
    });

    console.log(`Extracted ${faculty.length} Communication faculty members`);
    return faculty;
    
  } catch (err) {
    console.error("Error scraping Communication:", err.message);
    return [];
  }
}