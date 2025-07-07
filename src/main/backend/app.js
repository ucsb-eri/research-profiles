const express = require('express');
const cors = require('cors');
const facultyRoutes = require('./routes/faculty');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/faculty', facultyRoutes); // Mount faculty routes

module.exports = app;