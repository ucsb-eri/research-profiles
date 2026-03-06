import axios from 'axios';
import { load } from 'cheerio';

/**
 * Generic scraper for WordPress-style faculty pages (History, Art History, etc.)
 * Works for pages with individual faculty cards/blocks
 */
export async function scrapeWordPressFaculty(url, departmentName) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];
    const baseUrl = new URL(url).origin;

    // Look for faculty entries - try multiple selectors
    const selectors = [
      'article', 
      '.faculty-member',
      '.person',
      '[class*="faculty"]',
      '.entry'
    ];

    let $entries = $();
    for (const selector of selectors) {
      $entries = $(selector);
      if ($entries.length > 5) break; // Found a good selector
    }

    // If no structured entries, look for text patterns
    if ($entries.length === 0) {
      // Parse text-based faculty list
      const textContent = $('body').text();
      const lines = textContent.split('\n').map(l => l.trim()).filter(l => l);
      
      let currentFaculty = null;
      for (const line of lines) {
        // Look for name pattern (usually comes with email or title keywords)
        if (line.match(/@ucsb\.edu|@.*\.edu/) && currentFaculty) {
          const emailMatch = line.match(/([\w\.-]+@[\w\.-]+\.\w+)/);
          if (emailMatch && currentFaculty) {
            currentFaculty.email = emailMatch[1];
          }
        } else if (line.match(/Professor|Lecturer|Chair|Director|Assistant|Associate/i)) {
          if (currentFaculty && !currentFaculty.title) {
            currentFaculty.title = line;
          } else {
            // This might be a new faculty member
            if (currentFaculty) {
              facultyData.push(currentFaculty);
            }
            currentFaculty = {
              name: null,
              title: line,
              email: null,
              department: departmentName
            };
          }
        }
      }
      if (currentFaculty) facultyData.push(currentFaculty);
    } else {
      // Parse structured entries
      $entries.each((_, entry) => {
        const $entry = $(entry);
        
        // Find name
        let name = null;
        let profileUrl = null;
        const $nameLink = $entry.find('a[href*="/faculty/"], a[href*="/people/"]').first();
        if ($nameLink.length) {
          name = $nameLink.text().trim();
          profileUrl = $nameLink.attr('href');
          if (profileUrl && profileUrl.startsWith('/')) {
            profileUrl = baseUrl + profileUrl;
          }
        }

        if (!name) {
          const $h = $entry.find('h2, h3, h4').first();
          name = $h.text().trim();
        }

        if (!name || name.length < 3) return;

        // Extract title
        let title = null;
        const titleText = $entry.text();
        const titleMatch = titleText.match(/(Professor|Lecturer|Chair|Director|Assistant Professor|Associate Professor|Distinguished Professor)[^\n]*/i);
        if (titleMatch) {
          title = titleMatch[0].trim();
        }

        // Extract email
        let email = null;
        const $emailLink = $entry.find('a[href^="mailto:"]').first();
        if ($emailLink.length) {
          email = $emailLink.attr('href').replace('mailto:', '').trim();
        } else {
          const emailMatch = titleText.match(/([\w\.-]+@[\w\.-]+\.\w+)/);
          if (emailMatch) {
            email = emailMatch[1];
          }
        }

        // Extract office
        let office = null;
        const officeMatch = titleText.match(/Office:\s*([^\n]+)/i) || 
                           titleText.match(/(HSSB|SSMS|Building)\s+\d+[^\n]*/i);
        if (officeMatch) {
          office = officeMatch[1] || officeMatch[0];
        }

        // Extract phone
        let phone = null;
        const phoneMatch = titleText.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
        if (phoneMatch) {
          phone = phoneMatch[0];
        }

        // Extract photo
        let photoUrl = null;
        const $img = $entry.find('img').first();
        if ($img.length) {
          photoUrl = $img.attr('src');
          if (photoUrl && photoUrl.startsWith('/')) {
            photoUrl = baseUrl + photoUrl;
          }
        }

        facultyData.push({
          name,
          title,
          specialization: null,
          email,
          phone,
          office,
          website: profileUrl,
          photo_url: photoUrl,
          research_areas: null,
          department: departmentName,
          profile_url: profileUrl
        });
      });
    }

    return facultyData;
  } catch (err) {
    console.error(`Error scraping ${departmentName}:`, err.message);
    return [];
  }
}

/**
 * Scraper for Drupal-based department pages (like Environmental Studies)
 * with .views-row structure
 */
export async function scrapeDrupalFaculty(url, departmentName) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];
    const baseUrl = new URL(url).origin;

    $('.view-content .views-row').each((_, row) => {
      const $row = $(row);
      const $cols = $row.find('.views-col');
      
      $cols.each((_, col) => {
        const $col = $(col);
        
        let name = null;
        let profileUrl = null;
        
        const nameSelectors = [
          '.views-field-title a',
          '.views-field-field-name a',
          'h3 a',
          'h2 a'
        ];
        
        for (const selector of nameSelectors) {
          const $nameElem = $col.find(selector).filter(function() {
            return $(this).text().trim().length > 0;
          }).first();
          
          if ($nameElem.length) {
            name = $nameElem.text().trim();
            profileUrl = $nameElem.attr('href');
            if (name && profileUrl) break;
          }
        }
        
        if (!name) return;
        
        if (profileUrl && profileUrl.startsWith('/')) {
          profileUrl = baseUrl + profileUrl;
        }

        let photoUrl = null;
        const $img = $col.find('img').first();
        if ($img.length) {
          photoUrl = $img.attr('src');
          if (photoUrl && photoUrl.startsWith('/')) {
            photoUrl = baseUrl + photoUrl;
          }
        }

        let title = null;
        const titleSelectors = [
          '.views-field-field-affiliation .field-content',
          '.views-field-field-title .field-content'
        ];
        
        for (const selector of titleSelectors) {
          const $titleElem = $col.find(selector).first();
          if ($titleElem.length) {
            title = $titleElem.text().trim().replace(/\s+/g, ' ');
            if (title) break;
          }
        }

        let specialization = null;
        const $specElem = $col.find('.views-field-field-specialization .field-content').first();
        if ($specElem.length) {
          specialization = $specElem.text().trim().replace(/\s+/g, ' ');
        }

        let email = null;
        const $emailLink = $col.find('a[href^="mailto:"]').first();
        if ($emailLink.length) {
          email = $emailLink.attr('href').replace('mailto:', '').trim();
        }

        let phone = null;
        const $phoneElem = $col.find('.views-field-field-contact-phone .field-content').first();
        if ($phoneElem.length) {
          phone = $phoneElem.text().trim();
        }

        let office = null;
        const $officeElem = $col.find('.views-field-field-office-location .field-content').first();
        if ($officeElem.length) {
          office = $officeElem.text().trim();
        }

        facultyData.push({
          name,
          title,
          specialization,
          email,
          phone,
          office,
          website: profileUrl,
          photo_url: photoUrl,
          research_areas: specialization,
          department: departmentName,
          profile_url: profileUrl
        });
      });
    });

    return facultyData;
  } catch (err) {
    console.error(`Error scraping ${departmentName}:`, err.message);
    return [];
  }
}

/**
 * Main scraper router - determines which scraper to use based on URL
 */
export async function scrapeDrupalWordpress(url, departmentName) {
  // Determine scraper type based on URL patterns
  if (url.includes('es.ucsb.edu') || 
      url.includes('linguistics.ucsb.edu') ||
      url.includes('spanport.ucsb.edu') ||
      url.includes('arthistory.ucsb.edu') ||
      url.includes('writing.ucsb.edu') ||
      url.includes('pstat.ucsb.edu')) {
    return await scrapeDrupalFaculty(url, departmentName);
  } else {
    return await scrapeWordPressFaculty(url, departmentName);
  }
}
