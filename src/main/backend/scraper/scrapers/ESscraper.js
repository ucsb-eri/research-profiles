import axios from 'axios';
import { load } from 'cheerio';

/**
 * Scraper for UCSB Environmental Studies faculty page
 * @param {string} url - Faculty page URL
 * @param {string} departmentName - Name of the department
 * @returns {Promise<Array<Object>>} - Array of faculty objects
 */
export async function scrapeESFaculty(url, departmentName) {
  try {
    const res = await axios.get(url);
    const $ = load(res.data);
    const facultyData = [];
    const baseUrl = new URL(url).origin;

    $('.view-content .views-row').each((_, row) => {
      const $row = $(row);
      
      // Each views-row might contain multiple views-col (columns) - one per faculty member
      const $cols = $row.find('.views-col');
      
      $cols.each((_, col) => {
        const $col = $(col);
        
        // Find name within this specific column
        let name = null;
        let profileUrl = null;
        
        const nameSelectors = [
          '.views-field-title a',
          '.views-field-field-name a',
          '.views-field-name a',
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
        
        if (!name) return; // Skip this column if no name found
        
        if (profileUrl && profileUrl.startsWith('/')) {
          profileUrl = baseUrl + profileUrl;
        }

        // Look for photo within this column
        let photoUrl = null;
        const $img = $col.find('img').first();
        if ($img.length) {
          photoUrl = $img.attr('src');
          if (photoUrl && photoUrl.startsWith('/')) {
            photoUrl = baseUrl + photoUrl;
          }
        }

        // Look for title within this column only
        let title = null;
        const titleSelectors = [
          '.views-field-field-affiliation .field-content',
          '.views-field-field-title .field-content',
          '.views-field-title-1 .field-content',
          '.field-name-field-affiliation',
          '.field-name-field-title'
        ];
        
        for (const selector of titleSelectors) {
          const $titleElem = $col.find(selector).first();
          if ($titleElem.length) {
            title = $titleElem.text().trim().replace(/\s+/g, ' ');
            if (title) break;
          }
        }

        // Look for specialization within this column
        let specialization = null;
        const specSelectors = [
          '.views-field-field-specialization .field-content',
          '.views-field-field-research-areas .field-content',
          '.field-name-field-specialization'
        ];
        
        for (const selector of specSelectors) {
          const $specElem = $col.find(selector).first();
          if ($specElem.length) {
            specialization = $specElem.text().trim().replace(/\s+/g, ' ');
            if (specialization) break;
          }
        }

        // Look for email within this column
        let email = null;
        const $emailLink = $col.find('a[href^="mailto:"]').first();
        if ($emailLink.length) {
          email = $emailLink.attr('href').replace('mailto:', '').trim();
        } else {
          const emailSelectors = [
            '.views-field-field-contact-email .field-content',
            '.views-field-field-email .field-content',
            '.field-name-field-email'
          ];
          
          for (const selector of emailSelectors) {
            const $emailElem = $col.find(selector).first();
            if ($emailElem.length) {
              const emailText = $emailElem.text().trim();
              if (emailText.includes('@')) {
                email = emailText;
                break;
              }
            }
          }
        }

        // Look for phone within this column
        let phone = null;
        const phoneSelectors = [
          '.views-field-field-contact-phone .field-content',
          '.views-field-field-phone .field-content',
          '.field-name-field-phone'
        ];
        
        for (const selector of phoneSelectors) {
          const $phoneElem = $col.find(selector).first();
          if ($phoneElem.length) {
            phone = $phoneElem.text().trim();
            if (phone) break;
          }
        }

        // Look for office within this column
        let office = null;
        const officeSelectors = [
          '.views-field-field-office-location .field-content',
          '.views-field-field-office .field-content',
          '.field-name-field-office'
        ];
        
        for (const selector of officeSelectors) {
          const $officeElem = $col.find(selector).first();
          if ($officeElem.length) {
            office = $officeElem.text().trim();
            if (office) break;
          }
        }

        console.log(`Extracted: ${name} - ${title || 'no title'} - ${email || 'no email'}`);

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
          profile_url: profileUrl,
        });
      });
    });

    console.log(`Extracted ${facultyData.length} faculty members`);
    return facultyData;
    
  } catch (err) {
    console.error(`Error scraping ${departmentName}:`, err.message);
    return [];
  }
}