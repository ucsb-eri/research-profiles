import db from '../config/db_config.js';

// Site administrators (see migration 009_admins.sql). An admin may edit any
// faculty profile/summary; everyone else can only edit a profile whose email
// matches their signed-in account. Emails are stored and compared lowercased.

// Normalize an email the same way auth does (Google email is lowercased before
// the ownership check), so lookups never miss on case alone.
const norm = (email) => (email || '').trim().toLowerCase();

// True if the email belongs to a site admin. Used by requireProfileOwnerOrAdmin
// on every edit request, so keep it a single indexed lookup.
export async function isAdmin(email) {
  const e = norm(email);
  if (!e) return false;
  const res = await db.query('SELECT 1 FROM admins WHERE email = $1', [e]);
  return res.rowCount > 0;
}

// Add (or update the note of) an admin. Idempotent — re-adding an existing admin
// just refreshes the note. Returns the stored row.
export async function addAdmin(email, note = null) {
  const e = norm(email);
  const res = await db.query(
    `INSERT INTO admins (email, note) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET note = COALESCE(EXCLUDED.note, admins.note)
     RETURNING email, note, created_at`,
    [e, note]
  );
  return res.rows[0];
}

// Remove an admin. Returns true if a row was deleted, false if they weren't one.
export async function removeAdmin(email) {
  const res = await db.query('DELETE FROM admins WHERE email = $1', [norm(email)]);
  return res.rowCount > 0;
}

// All admins, oldest first. For the management script's --list.
export async function listAdmins() {
  const res = await db.query(
    'SELECT email, note, created_at FROM admins ORDER BY created_at ASC, email ASC'
  );
  return res.rows;
}
