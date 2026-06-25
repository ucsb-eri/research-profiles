import axios from 'axios';
import https from 'https';
import * as cheerio from 'cheerio';
import { URL } from 'url';

// Many UCSB department servers serve an incomplete certificate chain (missing
// intermediate), so a verified fetch fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE.
// Retry those hosts with verification off — we only read public page HTML.
// Mirrors the fallback in facultySumm_model.extractTextFromUrl.
const insecureAgent = new https.Agent({ rejectUnauthorized: false });
const TLS_CHAIN_ERRORS = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'SELF_SIGNED_CERT_IN_CHAIN',
]);

async function fetchHtml(url) {
  try {
    return await axios.get(url, { timeout: 10000 });
  } catch (err) {
    if (!TLS_CHAIN_ERRORS.has(err.code)) throw err;
    console.warn(`TLS chain unverifiable for ${url} (${err.code}); retrying without verification`);
    return await axios.get(url, { timeout: 10000, httpsAgent: insecureAgent });
  }
}

// A URL is a CV only when a CV-ish token appears at a boundary, not as an
// arbitrary substring and not merely because it's a .pdf (papers are PDFs too).
// Boundaries are any non-alphanumeric char (or string ends), so "cv.pdf",
// "/curriculum-vitae", "resume.html" match, but "vital", "gravitas", and a bare
// publication PDF (e.g. ".../1-s2.0-S0306261925006622-main.pdf") do not.
const CV_PATTERN =
  /(?:^|[^a-z0-9])(cv|c\.v|resume|resum[eé]|vitae?|curriculum[-_ ]?vitae)(?:[^a-z0-9]|$)/i;
const looksLikeCv = (url) => CV_PATTERN.test(url);

export async function gatherResearchLinks(baseUrl, maxPages = 6) {
  const visited = new Set();
  const allUrls = new Set([baseUrl]);
  let orcidUrl = null;
  let scholarUrl = null;
  let cvUrl = null;

  try {
    const resp = await fetchHtml(baseUrl);
    const $ = cheerio.load(resp.data);
    const links = $('a[href]')
      .map((_, el) => $(el).attr('href'))
      .get();

    for (const href of links) {
      const fullUrl = new URL(href, baseUrl).href;
      if (visited.has(fullUrl)) continue;
      visited.add(fullUrl);

      const hrefLower = href.toLowerCase();

      if (!scholarUrl && href.includes('scholar.google')) {
        scholarUrl = fullUrl; // was only console.log'd before, so it was always dropped
      } else if (!orcidUrl && href.includes('orcid.org')) {
        orcidUrl = fullUrl;
      } else if (!cvUrl && looksLikeCv(fullUrl)) {
        cvUrl = fullUrl;
        allUrls.add(fullUrl);
      } else {
        const baseDomain = new URL(baseUrl).hostname;
        const fullDomain = new URL(fullUrl).hostname;
        if (
          fullDomain === baseDomain &&
          allUrls.size < maxPages &&
          ['research', 'project', 'publication', 'bio', 'cv', 'about', 'news', 'people', 'team', 'profile'].some((k) =>
            hrefLower.includes(k)
          )
        ) {
          allUrls.add(fullUrl);
        }
      }
      // Don't break once allUrls hits maxPages: keep scanning so an orcid/
      // scholar/cv link appearing later in the page is still captured. The
      // crawl list is bounded by the allUrls.size check above and the slice below.
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
