-- 009_admins.sql
-- Site administrators, identified by their verified @ucsb.edu email.
--
-- An admin may edit ANY faculty profile and its AI summary, not just their own
-- (see middleware/auth.requireProfileOwnerOrAdmin). Ownership is otherwise by
-- email match (faculty.email == signed-in account); admins are the override.
--
-- Email is the primary key and is stored lowercased to match how auth compares
-- it (Google email is lowercased before any check). Manage rows with
-- scripts/manageAdmins.js (npm run admin:add / admin:remove / admin:list).

CREATE TABLE IF NOT EXISTS admins (
  email      TEXT PRIMARY KEY,                  -- lowercased @ucsb.edu address
  note       TEXT,                              -- optional: who/why, for the audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
