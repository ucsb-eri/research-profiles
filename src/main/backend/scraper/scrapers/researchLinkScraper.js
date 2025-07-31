import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export async function gatherResearchLinks(baseUrl, maxPages = 6) {
  const visited = new Set();
  const allUrls = new Set([baseUrl]);
  let orcidUrl = null;
  let scholarUrl = null;
  let cvUrl = null;

  try {
    const resp = await axios.get(baseUrl, { timeout: 10000 });
    const $ = cheerio.load(resp.data);
    const links = $('a[href]')
      .map((_, el) => $(el).attr('href'))
      .get();

    for (const href of links) {
      const fullUrl = new URL(href, baseUrl).href;
      if (visited.has(fullUrl)) continue;
      visited.add(fullUrl);

      const hrefLower = href.toLowerCase();

      if (!scholarUrl && href.includes('scholar.google')){
        console.log(`Logging Google Scholar link: ${fullUrl}`);
      } else if (href.includes('orcid.org') && !orcidUrl) {
        orcidUrl = fullUrl;
      } else if (
        !cvUrl && 
        fullUrl.endsWith('.pdf') ||
        (hrefLower.includes('cv') || hrefLower.includes('vita'))
      ) {
        cvUrl = fullUrl;
        allUrls.add(fullUrl);
      } else {
        const baseDomain = new URL(baseUrl).hostname;
        const fullDomain = new URL(fullUrl).hostname;
        if (
          fullDomain === baseDomain &&
          ['research', 'project', 'publication', 'bio', 'cv', 'about', 'news', 'people', 'team', 'profile'].some((k) =>
            hrefLower.includes(k)
          )
        ) {
          allUrls.add(fullUrl);
        }
      }

      if (allUrls.size >= maxPages) break;
    }
  } catch (err) {
    console.error(`Error gathering links from ${baseUrl}: ${err.message}`);
  }

  return {
    
    orcidUrl,
    googleScholarUrl: scholarUrl,
    cvUrl,
    crawledUrls: Array.from(allUrls).slice(0, maxPages),
  };
}
