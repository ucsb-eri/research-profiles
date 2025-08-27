import express from 'express';
import cors from 'cors';
import facultyRoutes from './routes/facultyRoutes.js';
import facultyLinksRoutes from './routes/facultyLinksRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

// Use real database routes (comment out the mock routes)
// app.use('/api/faculty', mockFacultyRoutes); // Mount mock faculty routes
app.use('/api/faculty', facultyRoutes); // Mount real faculty routes
app.use('/api/faculty-links', facultyLinksRoutes); // Mount faculty links routes

export default app;