import express from 'express';
import cors from 'cors';
import facultyRoutes from './routes/facultyRoutes.js';
import facultyLinksRoutes from './routes/facultyLinksRoutes.js';
import facultySummaryRoutes from './routes/facultySummaryRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { UPLOAD_ROOT, UPLOAD_URL_PATH } from './config/uploads.js';

const app = express();
// Behind the production reverse proxy, trust X-Forwarded-* so req.protocol/host
// reflect the public URL — used when building uploaded-photo URLs.
app.set('trust proxy', true);
app.use(cors({
  origin: ['https://research-profiles.grit.ucsb.edu', 'http://localhost:3000'],
  // Let the browser read the pagination total on GET /api/faculty?limit=...
  exposedHeaders: ['X-Total-Count'],
}));
app.use(express.json());

// Serve user-uploaded files (faculty photos). Cached for a day; filenames are
// timestamped so a replaced photo gets a fresh URL rather than a stale cache hit.
app.use(UPLOAD_URL_PATH, express.static(UPLOAD_ROOT, { maxAge: '1d' }));

app.use('/api/faculty', facultyRoutes); // Mount faculty routes
app.use('/api/faculty-links', facultyLinksRoutes); // Mount faculty links routes
app.use('/api/faculty-summaries', facultySummaryRoutes); // Mount faculty summary/keyword routes
app.use('/api/auth', authRoutes); // Mount auth identity routes (/me)

export default app;
