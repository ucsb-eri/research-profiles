import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Without this listener, an error on an idle pooled client (e.g. the DB drops
// the connection) is emitted as an 'error' event with no handler, which crashes
// the whole process. Log it and let the pool recycle the client instead.
pool.on('error', (error) => {
  console.error(
    'Unexpected idle Postgres client error:', error.message,
    error.code ? `(code ${error.code})` : ''
  );
});

export default pool;

