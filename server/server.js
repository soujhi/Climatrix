import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import datasetRoutes from './routes/datasetRoutes.js';

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
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));

// Serve uploaded temporary files statically if needed
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Core REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Climatrix REST API server is healthy and running' });
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

app.listen(PORT, () => {
  console.log(`[Climatrix Backend] Express server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
