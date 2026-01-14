import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

async function extractLinksFromPage(url, baseDomain) {
  const results = {
    orcidUrl: null,
    scholarUrl: null,
    cvUrl: null,
    personalWebsite: null,
    internalLinks: new Set(),
  };

  const resp = await axios.get(url, { timeout: 10000 });
  const $ = cheerio.load(resp.data);

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;

    let fullUrl;
    try {
      fullUrl = new URL(href, url).href;
    } catch {
      return;
    }

    const hrefLower = href.toLowerCase();
    const fullDomain = new URL(fullUrl).hostname;

    /* ---- Identity links ---- */
    if (!results.scholarUrl && fullUrl.includes('scholar.google')) {
      results.scholarUrl = fullUrl;
      return;
    }

    if (!results.orcidUrl && fullUrl.includes('orcid.org')) {
      results.orcidUrl = fullUrl;
      return;
    }

    if (
      !results.cvUrl &&
      fullUrl.endsWith('.pdf') &&
      (hrefLower.includes('cv') || hrefLower.includes('vita'))
    ) {
      results.cvUrl = fullUrl;
      return;
    }

    /* ---- Personal site candidate ---- */
    if (
      !results.personalWebsite &&
      fullDomain !== baseDomain &&
      !fullUrl.endsWith('.pdf') &&
      !fullUrl.includes('scholar.google') &&
      !fullUrl.includes('orcid.org')
    ) {
      results.personalWebsite = fullUrl;
      return;
    }

    /* ---- Internal research pages ---- */
    if (
      fullDomain === baseDomain &&
      ['research', 'publication', 'project', 'profile', 'about'].some(k =>
        hrefLower.includes(k)
      )
    ) {
      results.internalLinks.add(fullUrl);
    }
  });

  return results;
}

export async function gatherResearchLinks(baseUrl, maxInternalPages = 6) {
  const baseDomain = new URL(baseUrl).hostname;
  const visited = new Set();

  let orcidUrl = null;
  let googleScholarUrl = null;
  let cvUrl = null;
  let personalWebsite = null;
  const crawledUrls = new Set([baseUrl]);

  /* ---------- LEVEL 0: department profile ---------- */
  try {
    visited.add(baseUrl);

    const level0 = await extractLinksFromPage(baseUrl, baseDomain);

    orcidUrl = level0.orcidUrl;
    googleScholarUrl = level0.scholarUrl;
    cvUrl = level0.cvUrl;
    personalWebsite = level0.personalWebsite;

    level0.internalLinks.forEach(u => crawledUrls.add(u));
  } catch (err) {
    console.error(`Level 0 crawl failed: ${err.message}`);
  }

  /* ---------- LEVEL 1: personal website ---------- */
  if (personalWebsite && !visited.has(personalWebsite)) {
    try {
      visited.add(personalWebsite);

      const personalDomain = new URL(personalWebsite).hostname;
      const level1 = await extractLinksFromPage(personalWebsite, personalDomain);

      orcidUrl ||= level1.orcidUrl;
      googleScholarUrl ||= level1.scholarUrl;
      cvUrl ||= level1.cvUrl;

      // Prefer CV found on personal site
    } catch (err) {
      console.warn(`Personal site crawl failed: ${err.message}`);
    }
  }

  return {
    orcidUrl,
    googleScholarUrl,
    cvUrl,
    personalWebsite,
    crawledUrls: Array.from(crawledUrls).slice(0, maxInternalPages),
  };
}




// export async function gatherResearchLinks(baseUrl, maxPages = 6) {
//   const visited = new Set();
//   const allUrls = new Set([baseUrl]);
//   let orcidUrl = null;
//   let scholarUrl = null;
//   let cvUrl = null;

//   try {
//     const resp = await axios.get(baseUrl, { timeout: 10000 });
//     const $ = cheerio.load(resp.data);
//     const links = $('a[href]')
//       .map((_, el) => $(el).attr('href'))
//       .get();

//     for (const href of links) {
//       const fullUrl = new URL(href, baseUrl).href;
//       if (visited.has(fullUrl)) continue;
//       visited.add(fullUrl);

//       const hrefLower = href.toLowerCase();

//       if (!scholarUrl && href.includes('scholar.google')){
//         console.log(`Logging Google Scholar link: ${fullUrl}`);
//       } else if (href.includes('orcid.org') && !orcidUrl) {
//         orcidUrl = fullUrl;
//       } else if (
//         !cvUrl && 
//         fullUrl.endsWith('.pdf') ||
//         (hrefLower.includes('cv') || hrefLower.includes('vita'))
//       ) {
//         cvUrl = fullUrl;
//         allUrls.add(fullUrl);
//       } else {
//         const baseDomain = new URL(baseUrl).hostname;
//         const fullDomain = new URL(fullUrl).hostname;
//         if (
//           fullDomain === baseDomain &&
//           ['research', 'project', 'publication', 'bio', 'cv', 'about', 'news', 'people', 'team', 'profile'].some((k) =>
//             hrefLower.includes(k)
//           )
//         ) {
//           allUrls.add(fullUrl);
//         }
//       }

//       if (allUrls.size >= maxPages) break;
//     }
//   } catch (err) {
//     console.error(`Error gathering links from ${baseUrl}: ${err.message}`);
//   }

//   return {
    
//     orcidUrl,
//     googleScholarUrl: scholarUrl,
//     cvUrl,
//     crawledUrls: Array.from(allUrls).slice(0, maxPages),
//   };
// }
