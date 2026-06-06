import app from './app.js';
// Default to 3001 so it doesn't collide with the Next.js frontend dev server (3000).
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});