import app from './app.js';
const PORT = process.env.PORT || 3001; // Use 3001 to avoid conflict with Next.js frontend on 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});