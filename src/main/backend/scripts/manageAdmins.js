import 'dotenv/config';
import { addAdmin, removeAdmin, listAdmins } from '../models/admin_model.js';
import db from '../config/db_config.js';

// Manage site administrators (the admins table, migration 009). An admin may
// edit ANY faculty profile and summary, not just their own.
//
// Usage:
//   node src/main/backend/scripts/manageAdmins.js --add you@ucsb.edu [--note "Dept IT"]
//   node src/main/backend/scripts/manageAdmins.js --remove you@ucsb.edu
//   node src/main/backend/scripts/manageAdmins.js --list
//   (or: npm run admin:add -- you@ucsb.edu, admin:remove -- you@ucsb.edu, admin:list)

const USAGE = [
  'Usage:',
  '  --add <email> [--note "..."]   grant admin (idempotent; refreshes note)',
  '  --remove <email>               revoke admin',
  '  --list                         list all admins',
].join('\n');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      // Treat flags whose next token is another flag (or absent) as booleans.
      if (next === undefined || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  try {
    if (args.list) {
      const admins = await listAdmins();
      if (!admins.length) {
        console.log('No admins yet. Add one with: --add you@ucsb.edu');
        return;
      }
      console.log(`Admins (${admins.length}):`);
      for (const a of admins) {
        const when = a.created_at instanceof Date ? a.created_at.toISOString() : a.created_at;
        console.log(`  ${a.email}${a.note ? `  — ${a.note}` : ''}  (added ${when})`);
      }
      return;
    }

    if (args.add) {
      const email = String(args.add).trim().toLowerCase();
      if (!email.includes('@')) {
        console.error(`"${email}" doesn't look like an email.\n\n${USAGE}`);
        process.exitCode = 1;
        return;
      }
      if (!email.endsWith('@ucsb.edu')) {
        console.warn(
          `Warning: ${email} is not @ucsb.edu. The app's Google auth only accepts ` +
          `@ucsb.edu accounts, so this admin won't be able to sign in.`
        );
      }
      const note = typeof args.note === 'string' ? args.note : null;
      const row = await addAdmin(email, note);
      console.log(`Granted admin: ${row.email}${row.note ? `  — ${row.note}` : ''}`);
      return;
    }

    if (args.remove) {
      const email = String(args.remove).trim().toLowerCase();
      const removed = await removeAdmin(email);
      console.log(removed ? `Revoked admin: ${email}` : `${email} was not an admin.`);
      return;
    }

    console.error(USAGE);
    process.exitCode = 1;
  } catch (err) {
    console.error('Admin management failed:', err.message || '(no message)');
    if (err.code) console.error('  code:', err.code);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
