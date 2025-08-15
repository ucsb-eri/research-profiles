import express from 'express';
import cors from 'cors';
import facultyRoutes from './routes/facultyRoutes.js';
import facultyLinksRoutes from './routes/facultyLinksRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/faculty', facultyRoutes); // Mount faculty routes
app.use('/api/faculty-links', facultyLinksRoutes); // Mount faculty links routes

export default app;