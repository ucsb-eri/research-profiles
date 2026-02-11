import axios from 'axios';
import { load } from 'cheerio';

//work in progress

/**
 * Scraper for UCSB Black Studies department people page.
 * Handles split structure: images in one section, text info in another.
 * @param {string} url - Full faculty page URL
 * @param {string} departmentName - Name of the department for labeling
 * @returns {Promise<Array<Object>>} - Array of faculty objects
 */
export async function scrapeBlackStudies(url, departmentName) {
  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  
  const $ = load(res.data);
  const facultyData = [];
  const baseUrl = new URL(url).origin;

  console.log('Scraping Black Studies faculty...');

  // Strategy: Build a map of profile URL -> photo URL from image links
  const photoMap = new Map();
  
  $('a[href*="/faculty-staff/"]').each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    if (!href) return;
    
    const fullUrl = href.startsWith('/') ? baseUrl + href : href;
    
    // Check if this link contains an image
    const $img = $link.find('img').first();
    if ($img.length) {
      // Try srcset first (gives best quality), then fallback to src
      let photoUrl = null;
      const srcset = $img.attr('srcset');
      
      if (srcset) {
        // Parse srcset - format: "url1 width1, url2 width2, ..."
        // Get the highest resolution image (last one usually)
        const srcsetParts = srcset.split(',').map(s => s.trim());
        if (srcsetParts.length > 0) {
          // Get the URL from the last (highest res) entry
          const lastPart = srcsetParts[srcsetParts.length - 1];
          photoUrl = lastPart.split(' ')[0]; // Get URL before width descriptor
        }
      }
      
      // Fallback to regular src
      if (!photoUrl) {
        photoUrl = $img.attr('src') || $img.attr('data-src');
      }
      
      if (photoUrl?.startsWith('/')) {
        photoUrl = baseUrl + photoUrl;
      }
      
      // Filter out SVG icons
      if (photoUrl && !photoUrl.includes('svg')) {
        photoMap.set(fullUrl, photoUrl);
      }
      
      // Also try to get name from img alt
      const altName = $img.attr('alt');
      if (altName && !photoMap.has(fullUrl + '_name')) {
        photoMap.set(fullUrl + '_name', altName.trim());
      }
    }
  });

  console.log(`Found ${photoMap.size / 2} faculty with photos`);

  // Now find all text-based faculty entries
  // These might be in different view rows or in a list
  const seenUrls = new Set();
  
  // Look for all faculty profile links (including text-based ones)
  $('a[href*="/faculty-staff/"]').each((_, link) => {
    const $link = $(link);
    const href = $link.attr('href');
    if (!href) return;
    
    const fullUrl = href.startsWith('/') ? baseUrl + href : href;
    
    if (seenUrls.has(fullUrl)) return;
    seenUrls.add(fullUrl);

    // Get name from link text first
    let name = $link.text().trim();
    
    // If no text in link, try img alt attribute
    if (!name) {
      const $img = $link.find('img');
      if ($img.length) {
        name = $img.attr('alt')?.trim() || '';
      }
    }
    
    // Fallback: get name from stored map
    if (!name) {
      name = photoMap.get(fullUrl + '_name') || '';
    }
    
    // Last resort: extract from URL
    if (!name || name.length < 3) {
      const urlName = href.split('/').pop();
      if (urlName) {
        name = urlName.replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
    
    if (!name || name.length < 3) return;

    // Find container for text info
    const $container = $link.closest('div, article, section, p, li');
    const fullText = $container.text();
    const lines = fullText.split('\n').map(l => l.trim()).filter(l => l && l.length > 2);
    
    // Find title
    let title = null;
    const nameIdx = lines.findIndex(l => l.includes(name));
    if (nameIdx >= 0 && nameIdx < lines.length - 1) {
      const nextLine = lines[nameIdx + 1];
      if (!nextLine.includes('@') && 
          !nextLine.match(/room|hall|building/i) && 
          nextLine.length < 100 &&
          nextLine.length > 5) {
        title = nextLine;
      }
    }

    // Find email
    let email = null;
    const emailElem = $container.find('a[href^="mailto:"]').first();
    if (emailElem.length) {
      email = emailElem.attr('href')?.replace('mailto:', '').trim();
    } else {
      const emailMatch = fullText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+)/);
      if (emailMatch) email = emailMatch[1];
    }

    // Find office
    const officeMatch = fullText.match(/(?:room|office:?)\s*([0-9]+[a-z]?\s*(?:south|north)?\s*hall)/i);
    const office = officeMatch ? officeMatch[0] : null;

    // Find phone
    const phoneMatch = fullText.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : null;

    // Get photo from map
    const photoUrl = photoMap.get(fullUrl) || null;

    // Extract research areas
    let research_areas = null;
    const researchMatch = fullText.match(/(?:research|interests?|focuses?|specializes?)\s+(?:on|in|include)[:\s]+([^.]+)/i);
    if (researchMatch) {
      research_areas = researchMatch[1].trim().substring(0, 500);
    }

    facultyData.push({
      name,
      title,
      specialization: null,
      email,
      phone,
      office,
      website: fullUrl,
      photo_url: photoUrl,
      research_areas,
      department: departmentName,
      profile_url: fullUrl,
    });
  });

  console.log(`Total faculty scraped: ${facultyData.length}`);
  
  if (facultyData.length > 0) {
    console.log('\nSample faculty data:');
    facultyData.slice(0, 3).forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      console.log(`     Title: ${f.title || 'N/A'}`);
      console.log(`     Email: ${f.email || 'N/A'}`);
      console.log(`     Photo: ${f.photo_url ? 'Yes' : 'No'}`);
      if (f.photo_url) console.log(`     Photo URL: ${f.photo_url.substring(0, 80)}...`);
    });
  }
  
  return facultyData;
}