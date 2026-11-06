import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import datasetRoutes from './routes/datasetRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express Server
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// Serve uploaded temporary files statically if needed
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Core REST API Routes (supports both /api/* and root /* for serverless rewrites)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/datasets', datasetRoutes);
app.use('/datasets', datasetRoutes);

app.use('/api/analyses', analysisRoutes);
app.use('/analyses', analysisRoutes);

app.use('/api/workspaces', workspaceRoutes);
app.use('/workspaces', workspaceRoutes);

// Healthcheck Route
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Climatrix REST API server is healthy and running' });
});

// Root API probe
app.get(['/api', '/'], (req, res) => {
  res.status(200).json({ status: 'OK', name: 'Climatrix REST API', version: '1.0.0' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[Climatrix Backend] Express server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

export default app;
