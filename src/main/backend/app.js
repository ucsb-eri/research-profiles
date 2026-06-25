import express from 'express';
import cors from 'cors';
import facultyRoutes from './routes/facultyRoutes.js';
import facultyLinksRoutes from './routes/facultyLinksRoutes.js';
import facultySummaryRoutes from './routes/facultySummaryRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
app.use(cors({
  origin: ['https://research-profiles.grit.ucsb.edu', 'http://localhost:3000'],
  // Let the browser read the pagination total on GET /api/faculty?limit=...
  exposedHeaders: ['X-Total-Count'],
}));
app.use(express.json());

app.use('/api/faculty', facultyRoutes); // Mount faculty routes
app.use('/api/faculty-links', facultyLinksRoutes); // Mount faculty links routes
app.use('/api/faculty-summaries', facultySummaryRoutes); // Mount faculty summary/keyword routes
app.use('/api/auth', authRoutes); // Mount auth identity routes (/me)

export default app;
