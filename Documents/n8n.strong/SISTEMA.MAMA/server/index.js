import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 4000;
const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'server', 'data');
const seedPath = path.join(dataDir, 'seed.json');
const statePath = path.join(dataDir, 'state.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getSeedState() {
  const seed = readJsonFile(seedPath);
  if (!seed) {
    return { clientes: [], productos: [], facturas: [], pagos: [] };
  }
  return seed;
}

function ensureState() {
  const currentState = readJsonFile(statePath);
  if (currentState && Array.isArray(currentState.clientes) && Array.isArray(currentState.productos)) {
    return currentState;
  }

  const seed = getSeedState();
  writeJsonFile(statePath, seed);
  return seed;
}

function getState() {
  return ensureState();
}

function replaceState(state) {
  writeJsonFile(statePath, state);
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/state', (_req, res) => {
  res.json(getState());
});

app.post('/api/state', (req, res) => {
  try {
    replaceState(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'No se pudo guardar el estado' });
  }
});

const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Ruta API no encontrada' });
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend API listening on http://localhost:${PORT}`);
});
