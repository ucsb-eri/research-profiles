import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/db_config.js';

// Lightweight migration runner. Applies every *.sql file in this directory, in
// filename order, that hasn't been applied yet. Applied files are tracked in the
// schema_migrations table so re-running is safe (only pending migrations run).
//
// Usage: node src/main/backend/migrations/run.js   (or: npm run migrate)

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const client = await db.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const appliedRows = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(appliedRows.rows.map(r => r.filename));

    const files = fs
      .readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      process.stdout.write(`Applying ${file} ... `);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log('done');
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        console.error(`  ${err.message || '(no message)'}`);
        if (err.code) console.error(`  code: ${err.code}`);
        if (err.detail) console.error(`  detail: ${err.detail}`);
        if (err.hint) console.error(`  hint: ${err.hint}`);
        throw err;
      }
    }

    if (count === 0) console.log('No pending migrations. Database is up to date.');
    else console.log(`Applied ${count} migration(s).`);
  } finally {
    client.release();
    await db.end();
  }
}

run().catch(() => {
  process.exitCode = 1;
});
