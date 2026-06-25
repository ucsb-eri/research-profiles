// Parse a faculty display name into structured given/family parts and a
// canonical "First Last" display string.
//
// Why this exists: department sites present names inconsistently — some as
// "First Last", some as "Last, First" — and surnames can be multiple words
// ("Van de Walle"). Storing the raw string broke last-name sorting and showed
// "Alizadeh, Mahnoosh" verbatim. parseName normalizes all of that in one place
// (insertFaculty), so every scraper benefits without per-scraper logic.
//
// Reliability:
//   * "Last, First" (comma) is exact — the comma marks the surname boundary,
//     however many words it has.
//   * "First Last" (no comma) uses a nobiliary-particle list to group trailing
//     multi-word surnames; correct for the common cases but heuristic for
//     unusual names (owners can correct via the editable first_name/last_name).

// Lowercase nobiliary particles / prefixes that bind to the following surname
// token(s): "van de Walle", "del Río", "von Neumann", "de la Cruz", etc.
const PARTICLES = new Set([
  'van', 'von', 'der', 'den', 'de', 'del', 'della', 'di', 'da', 'das', 'dos',
  'du', 'la', 'le', 'el', 'al', 'bin', 'ibn', 'ter', 'ten', 'of', 'y', 'i',
  'st', 'st.',
]);

// Generational/honorific suffixes that must not be mistaken for a given name
// when they trail a comma ("Doe, Jane, Jr.").
const SUFFIXES = new Set([
  'jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v',
  'phd', 'ph.d.', 'md', 'm.d.', 'emeritus', 'emerita',
]);

/**
 * @param {string} raw - the name as scraped ("First Last" or "Last, First").
 * @returns {{ firstName: string, lastName: string, name: string }}
 *   firstName/lastName may be '' for mononyms; name is the canonical
 *   "First Last" display string (suffix appended to lastName).
 */
export function parseName(raw) {
  const s = (raw || '').replace(/\s+/g, ' ').trim();
  if (!s) return { firstName: '', lastName: '', name: '' };

  // Split on commas first. Strip a trailing suffix part so it can't be read as
  // the given name.
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  let suffix = '';
  if (parts.length >= 2 && SUFFIXES.has(parts[parts.length - 1].toLowerCase())) {
    suffix = parts.pop();
  }

  let firstName;
  let lastName;

  if (parts.length >= 2) {
    // "Last, First" — comma unambiguously marks the (possibly multi-word) surname.
    lastName = parts[0];
    firstName = parts.slice(1).join(' ');
  } else {
    // "First Last" — walk tokens from the end, absorbing particles into the surname.
    const t = parts[0].split(' ');
    if (t.length === 1) {
      firstName = '';
      lastName = t[0];
    } else {
      let start = t.length - 1; // last token is always part of the surname
      while (start > 1 && PARTICLES.has(t[start - 1].toLowerCase())) start--;
      firstName = t.slice(0, start).join(' ');
      lastName = t.slice(start).join(' ');
    }
  }

  if (suffix) lastName = `${lastName} ${suffix}`;
  const name = [firstName, lastName].filter(Boolean).join(' ');
  return { firstName, lastName, name };
}
