import express from 'express';
import cors from 'cors';
import facultyRoutes from './routes/facultyRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/faculty', facultyRoutes); // Mount faculty routes

export default app;