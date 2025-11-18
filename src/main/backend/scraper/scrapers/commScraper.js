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

    // The page has a simpler structure - just links with names and titles
    // We need to process pairs of elements: link (name) followed by text (title)
    const elements = $("body").find("a, p, div").toArray();
    
    let currentName = null;
    let currentProfileUrl = null;
    
    for (let i = 0; i < elements.length; i++) {
      const $el = $(elements[i]);
      const text = $el.text().trim();
      
      // Check if this is a faculty profile link
      const href = $el.attr("href");
      if (href && href.startsWith("/people/") && text && text.length > 0) {
        // This is a name link
        currentName = text;
        currentProfileUrl = href.startsWith("http") 
          ? href 
          : `https://www.comm.ucsb.edu${href}`;
        
        // Look ahead for the title (usually the next text element)
        let title = null;
        for (let j = i + 1; j < Math.min(i + 5, elements.length); j++) {
          const nextText = $(elements[j]).text().trim();
          // Check if it looks like a title (contains Professor, Lecturer, etc.)
          if (nextText && 
              (nextText.includes("Professor") || 
               nextText.includes("Lecturer") || 
               nextText.includes("Chair") ||
               nextText.includes("Director") ||
               nextText.includes("Dean") ||
               nextText.includes("Emerit"))) {
            title = nextText.replace(/\s+/g, " ");
            break;
          }
        }
        
        if (currentName && currentProfileUrl) {
          faculty.push({
            name: currentName,
            title: title,
            specialization: null,
            email: null,
            phone: null,
            office: null,
            website: currentProfileUrl,
            photo_url: null,
            research_areas: null,
            department,
            profile_url: currentProfileUrl
          });
        }
      }
    }
    
    // Remove duplicates based on profile URL
    const uniqueFaculty = Array.from(
      new Map(faculty.map(f => [f.profile_url, f])).values()
    );

    return uniqueFaculty;
  } catch (err) {
    console.error("Error scraping Communication:", err.message);
    return [];
  }
}