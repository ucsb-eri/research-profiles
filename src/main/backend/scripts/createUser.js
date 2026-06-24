import 'dotenv/config';
import { insertFaculty } from '../models/faculty_model.js';
import { DEPARTMENT_DIVISION } from '../scraper/divisions.js';
import db from '../config/db_config.js';

// Creates a test "user" — i.e. a faculty row. There is no separate users table:
// auth is Google OAuth and ownership is by email (requireProfileOwner matches
// the signed-in @ucsb.edu account to faculty.email), so a user is simply a
// faculty record whose email you can sign in with.
//
// Usage:
//   node src/main/backend/scripts/createUser.js --email you@ucsb.edu --name "Test User" \
//        [--department "Computer Science"] [--title "Professor"] [--division "Engineering"]
//   (or: npm run user:create -- --email you@ucsb.edu --name "Test User" ...)

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

const USAGE =
  'Usage: node src/main/backend/scripts/createUser.js --email you@ucsb.edu --name "Test User" ' +
  '[--department "Computer Science"] [--title "Professor"] [--division "Engineering"]';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // Store email lowercased to match how auth compares it (Google email is
  // lowercased before the ownership check).
  const email = (args.email || '').trim().toLowerCase();
  const name = (args.name || '').trim();
  const department = (args.department || '').trim() || null;
  const title = (args.title || '').trim() || null;
  const division =
    (args.division || '').trim() ||
    (department ? DEPARTMENT_DIVISION[department] ?? null : null);

  if (!email || !name) {
    console.error(USAGE);
    process.exitCode = 1;
    return;
  }
  if (!email.endsWith('@ucsb.edu')) {
    console.warn(
      `Warning: ${email} is not an @ucsb.edu address. The app's Google auth only ` +
      `accepts @ucsb.edu accounts, so this user won't be able to sign in to edit.`
    );
  }

  try {
    const existing = await db.query(
      'SELECT id, name FROM faculty WHERE lower(email) = $1',
      [email]
    );
    if (existing.rows.length) {
      const row = existing.rows[0];
      console.log(`A faculty row with email ${email} already exists: id ${row.id} (${row.name}).`);
      return;
    }

    const id = await insertFaculty({ name, email, department, title, division });
    if (id == null) {
      console.error('Insert did not return an id (unexpected unique conflict).');
      process.exitCode = 1;
      return;
    }

    console.log('Created test user (faculty row):');
    console.log(`  id:         ${id}`);
    console.log(`  name:       ${name}`);
    console.log(`  email:      ${email}`);
    console.log(`  department: ${department ?? '(none)'}`);
    console.log(`  division:   ${division ?? '(none)'}`);
    console.log(`\nSign in via Google with ${email}, then edit at /faculty/${id}/edit`);
  } catch (err) {
    console.error('Failed to create user:', err.message || '(no message)');
    if (err.code) console.error('  code:', err.code);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
