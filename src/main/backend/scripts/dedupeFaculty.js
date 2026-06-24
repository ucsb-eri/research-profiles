import 'dotenv/config';
import pg from 'pg';

// Removes duplicate faculty rows created by re-running the scraper loader.
//
// WHY DUPLICATES EXIST: faculty.email is UNIQUE, so insertFaculty()'s
// ON CONFLICT (email) DO NOTHING dedupes anyone with an email. But many scraped
// faculty have NO email, and Postgres treats every NULL as distinct — so each
// scrape run re-inserts those people, accumulating duplicates.
//
// WHAT COUNTS AS A DUPLICATE (a "group"):
//   * same email, case-insensitively (catches John@ vs john@ variants); else
//   * same name + department (the null-email re-run artifact).
//   The same name in a DIFFERENT department is left alone — that's a legitimate
//   cross-listing, not a duplicate.
//
// WHICH ROW IS KEPT per group (the rest are deleted):
//   1. the row that has a summary or research-links row (enriched / owner-edited),
//   2. then the row with the most non-null fields,
//   3. then the lowest id (oldest / stable).
// faculty_summaries and faculty_research_links FK to faculty(id) ON DELETE
// CASCADE, so a deleted duplicate's dependent rows are cleaned up automatically.
//
// SAFETY: dry-run by default — prints what it WOULD delete. Pass --apply to
// actually delete (inside a transaction).
//
// Usage:
//   node src/main/backend/scripts/dedupeFaculty.js            # dry run (default)
//   node src/main/backend/scripts/dedupeFaculty.js --apply    # perform deletion

const { Client } = pg;

// Shared ranking CTE: assigns each row a dedup_key, a "completeness" score, and
// a row number within its group (rn = 1 is the keeper).
const RANKED_CTE = `
  WITH ranked AS (
    SELECT
      f.id, f.name, f.email, f.department,
      CASE
        WHEN nullif(btrim(f.email), '') IS NOT NULL
          THEN 'e:' || lower(btrim(f.email))
        ELSE 'n:' || lower(regexp_replace(btrim(f.name), '\s+', ' ', 'g')) || '|'
                  || lower(regexp_replace(btrim(coalesce(f.department, '')), '\s+', ' ', 'g'))
      END AS dedup_key,
      ( (f.title IS NOT NULL)::int + (f.specialization IS NOT NULL)::int
      + (f.email IS NOT NULL)::int + (f.phone IS NOT NULL)::int
      + (f.office IS NOT NULL)::int + (f.website IS NOT NULL)::int
      + (f.photo_url IS NOT NULL)::int + (f.research_areas IS NOT NULL)::int
      + (f.department IS NOT NULL)::int + (f.profile_url IS NOT NULL)::int ) AS filled,
      ( EXISTS (SELECT 1 FROM faculty_summaries s WHERE s.faculty_id = f.id)
        OR EXISTS (SELECT 1 FROM faculty_research_links l WHERE l.faculty_id = f.id) )::int AS has_deps
    FROM faculty f
  ),
  numbered AS (
    SELECT ranked.*,
      ROW_NUMBER() OVER (
        PARTITION BY dedup_key
        ORDER BY has_deps DESC, filled DESC, id ASC
      ) AS rn,
      COUNT(*)   OVER (PARTITION BY dedup_key) AS grp_size
    FROM ranked
  )`;

async function main() {
  const apply = process.argv.includes('--apply');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();

    const { rows: [{ total }] } = await client.query('SELECT COUNT(*)::int AS total FROM faculty');

    // Summary of duplicate groups + how many rows would be removed.
    const { rows: [stats] } = await client.query(`
      ${RANKED_CTE}
      SELECT
        COUNT(DISTINCT dedup_key) FILTER (WHERE grp_size > 1)::int AS dup_groups,
        COUNT(*) FILTER (WHERE rn > 1)::int                        AS rows_to_delete
      FROM numbered
    `);

    console.log(`Faculty rows:        ${total}`);
    console.log(`Duplicate groups:    ${stats.dup_groups}`);
    console.log(`Rows to delete:      ${stats.rows_to_delete}`);

    if (stats.rows_to_delete === 0) {
      console.log('\nNo duplicates found. Nothing to do.');
      return;
    }

    // Show the largest groups so the operator can sanity-check before applying.
    const { rows: sample } = await client.query(`
      ${RANKED_CTE}
      SELECT
        dedup_key,
        grp_size,
        (array_agg(id ORDER BY rn))[1]                  AS keep_id,
        array_agg(id ORDER BY rn) FILTER (WHERE rn > 1) AS delete_ids,
        max(name) AS name
      FROM numbered
      WHERE grp_size > 1
      GROUP BY dedup_key, grp_size
      ORDER BY grp_size DESC, name ASC
      LIMIT 20
    `);

    console.log('\nLargest duplicate groups (keep -> delete):');
    for (const g of sample) {
      console.log(`  ${g.name} [${g.dedup_key}]  keep ${g.keep_id}, delete ${g.delete_ids.join(', ')}`);
    }
    if (stats.dup_groups > sample.length) {
      console.log(`  ... and ${stats.dup_groups - sample.length} more group(s).`);
    }

    if (!apply) {
      console.log('\nDRY RUN — no rows deleted. Re-run with --apply to delete the duplicates.');
      return;
    }

    // Apply: delete the non-keeper rows in a single transaction.
    await client.query('BEGIN');
    const del = await client.query(`
      ${RANKED_CTE}
      DELETE FROM faculty
      WHERE id IN (SELECT id FROM numbered WHERE rn > 1)
    `);
    await client.query('COMMIT');
    console.log(`\nDeleted ${del.rowCount} duplicate row(s). Dependent summaries/links cascaded.`);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* not in a tx */ }
    console.error('Dedupe failed:', err.message || '(no message)');
    if (err.code) console.error('  code:', err.code);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
