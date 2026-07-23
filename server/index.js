import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4000;
const rootDir = process.cwd();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const distDir = path.join(rootDir, 'dist');
app.use(express.static(distDir));
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
