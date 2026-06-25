import * as faculty_model from '../models/faculty_model.js';
import { isAdmin } from '../models/admin_model.js';

// UCSB identity = a verified @ucsb.edu Google Workspace account.
const UCSB_DOMAIN = 'ucsb.edu';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

// Verify the caller's Google access token server-side and derive their verified
// email. This is what makes editing safe: we never trust a client-supplied email
// header — we ask Google who the bearer token actually belongs to.
//
// On success sets req.userEmail (lowercased, verified, @ucsb.edu). Otherwise 401.
export async function requireUcsbAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization: Bearer <token>' });
  }

  try {
    const resp = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    const info = await resp.json();
    const email = (info.email || '').toLowerCase();

    if (!email || info.verified_email !== true) {
      return res.status(401).json({ error: 'Email not verified' });
    }
    // Restrict to UCSB Workspace accounts. Prefer the hosted-domain claim when
    // present; fall back to the email domain.
    const domainOk = info.hd === UCSB_DOMAIN || email.endsWith(`@${UCSB_DOMAIN}`);
    if (!domainOk) {
      return res.status(401).json({ error: 'A @ucsb.edu account is required' });
    }

    req.userEmail = email;
    next();
  } catch (err) {
    console.error('Auth verification failed:', err.message);
    return res.status(401).json({ error: 'Could not verify access token' });
  }
}

// Must run after requireUcsbAuth. Loads the faculty record for :id and authorizes
// the edit: the caller must either own the profile (verified email matches
// faculty.email) OR be a site admin (admins table, migration 009). Admins may
// edit any profile. Sets req.faculty, and req.isAdmin so handlers can tell which
// path authorized the request.
export async function requireProfileOwnerOrAdmin(req, res, next) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid faculty id' });
  }

  try {
    const faculty = await faculty_model.getById(id);
    if (!faculty) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    const isOwner = faculty.email && faculty.email.toLowerCase() === req.userEmail;
    // Only pay for the admin lookup when ownership doesn't already grant access.
    const admin = isOwner ? false : await isAdmin(req.userEmail);
    if (!isOwner && !admin) {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    req.faculty = faculty;
    req.isAdmin = admin;
    next();
  } catch (err) {
    console.error('Ownership check failed:', err.message);
    return res.status(500).json({ error: 'Failed to verify profile ownership' });
  }
}
