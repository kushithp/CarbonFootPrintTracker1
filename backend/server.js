// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import emissionRoutes from './routes/emissions.js';
import userRoutes from './routes/users.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/emissions', emissionRoutes);
app.use('/api/users', userRoutes);

// Standard health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// For local testing without Vite (Vanilla JS restructure)
// In production, we serve the frontend folder
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback for SPA routing if needed
app.get('*', (req, res, next) => {
  // If it starts with /api, don't serve index.html
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Export app for the root server entry
export default app;
