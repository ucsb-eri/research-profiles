import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';

//WIP

async function testBSscraper() {
  const url = "https://www.blackstudies.ucsb.edu/people";
  
  console.log(`Fetching ${url}...`);
  
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Save the HTML to a file for inspection
    fs.writeFileSync('page.html', res.data);
    console.log('✓ Page saved to page.html');
    
    const $ = load(res.data);
    
    // Debug information
    console.log('\n=== PAGE ANALYSIS ===');
    console.log('Page title:', $('title').text());
    console.log('Page length:', res.data.length, 'characters');
    console.log('Total links:', $('a').length);
    console.log('Total images:', $('img').length);
    console.log('Total divs:', $('div').length);
    
    // Check for various container types
    console.log('\n=== CONTAINER DETECTION ===');
    console.log('div.views-row:', $('div.views-row').length);
    console.log('article:', $('article').length);
    console.log('div[class*="person"]:', $('div[class*="person"]').length);
    console.log('div[class*="faculty"]:', $('div[class*="faculty"]').length);
    console.log('div.card:', $('div.card').length);
    
    // Look for faculty/people links
    console.log('\n=== FACULTY LINKS ===');
    const facultyLinks = $('a[href*="/faculty-staff/"], a[href*="/people/"]');
    console.log('Links with /faculty-staff/ or /people/:', facultyLinks.length);
    
    facultyLinks.slice(0, 10).each((i, el) => {
      const $el = $(el);
      console.log(`  ${i + 1}. ${$el.text().trim()} -> ${$el.attr('href')}`);
    });
    
    // Check for email addresses
    console.log('\n=== EMAIL DETECTION ===');
    const emails = $('a[href^="mailto:"]');
    console.log('Mailto links found:', emails.length);
    emails.slice(0, 5).each((i, el) => {
      console.log(`  ${i + 1}. ${$(el).attr('href')}`);
    });
    
    // Check for images
    console.log('\n=== IMAGE DETECTION ===');
    const images = $('img');
    console.log('Images found:', images.length);
    images.slice(0, 5).each((i, el) => {
      const $img = $(el);
      console.log(`  ${i + 1}. ${$img.attr('src') || $img.attr('data-src')}`);
    });
    
    // Check if page might be JavaScript-rendered
    console.log('\n=== JAVASCRIPT CHECK ===');
    const scripts = $('script');
    console.log('Script tags:', scripts.length);
    const hasReact = res.data.includes('react') || res.data.includes('React');
    const hasVue = res.data.includes('vue') || res.data.includes('Vue');
    const hasAngular = res.data.includes('angular') || res.data.includes('Angular');
    console.log('Likely React?', hasReact);
    console.log('Likely Vue?', hasVue);
    console.log('Likely Angular?', hasAngular);
    
    // Look for JSON data that might contain faculty info
    const jsonMatch = res.data.match(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonMatch) {
      console.log('\n=== JSON DATA FOUND ===');
      console.log('JSON length:', jsonMatch[1].length);
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        console.log('JSON structure:', Object.keys(jsonData));
      } catch (e) {
        console.log('Could not parse JSON');
      }
    }
    
    console.log('\n✓ Test complete. Check page.html for the full HTML');
    
  } catch (error) {
    console.error('Error fetching page:', error.message);
  }
}

testBSscraper();