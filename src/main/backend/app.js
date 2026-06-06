import express from 'express';
import cors from 'cors';
import facultyRoutes from './routes/facultyRoutes.js';
import facultyLinksRoutes from './routes/facultyLinksRoutes.js';
import facultySummaryRoutes from './routes/facultySummaryRoutes.js';

const app = express();
app.use(cors({ origin: ['https://research-profiles.grit.ucsb.edu', 'http://localhost:3000'] }));
app.use(express.json());

app.use('/api/faculty', facultyRoutes); // Mount faculty routes
app.use('/api/faculty-links', facultyLinksRoutes); // Mount faculty links routes
app.use('/api/faculty-summaries', facultySummaryRoutes); // Mount faculty summary/keyword routes

export default app;
