import express from 'express';
import { requireUcsbAuth } from '../middleware/auth.js';
import { isAdmin } from '../models/admin_model.js';

const router = express.Router();

// Who am I? Returns the verified @ucsb.edu identity and whether they're a site
// admin, so the frontend can decide which edit controls to show (admins see the
// edit UI on every profile, not just their own). Auth is enforced by middleware;
// reaching the handler means the token was valid.
router.get('/me', requireUcsbAuth, async (req, res) => {
  try {
    res.json({ email: req.userEmail, isAdmin: await isAdmin(req.userEmail) });
  } catch (err) {
    console.error('Failed to resolve auth identity:', err.message);
    res.status(500).json({ error: 'Failed to resolve identity' });
  }
});

export default router;
