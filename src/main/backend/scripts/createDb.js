import 'dotenv/config';
import pg from 'pg';

// Ensures the database named in DATABASE_URL exists. Connects to the server's
// "postgres" maintenance database and CREATE DATABASE if the target is missing.
// Run this once before migrations on a fresh server.
//
// Usage: node src/main/backend/scripts/createDb.js   (or: npm run db:create)

const { Client } = pg;

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
    process.exitCode = 1;
    return;
  }

  const target = decodeURIComponent(new URL(dbUrl).pathname.replace(/^\//, '')) || 'postgres';

  // Same server/credentials, but connect to the always-present "postgres" db so
  // we can issue CREATE DATABASE (which cannot run against the target itself).
  const adminUrl = new URL(dbUrl);
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  try {
    await client.connect();
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [target]);
    if (exists.rowCount > 0) {
      console.log(`Database "${target}" already exists.`);
    } else {
      // Identifier can't be a bind parameter; quote it safely.
      await client.query(`CREATE DATABASE "${target.replace(/"/g, '""')}"`);
      console.log(`Created database "${target}".`);
    }
  } catch (err) {
    console.error('Failed to create database:', err.message || '(no message)');
    if (err.code) console.error('  code:', err.code);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
