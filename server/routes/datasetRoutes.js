import express from 'express';
import {
  uploadDataset,
  getDatasets,
  getDatasetById,
  updateDataset,
  deleteDataset,
  getDatasetStatistics,
  getDatasetChartData,
  getDatasetGeoJSON,
  downloadDatasetCSV,
  downloadSampleCSV,
} from '../controllers/datasetController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

/**
 * DATASET ROUTES (E - Express Router)
 * Defines REST endpoints for CSV dataset CRUD, analytics, charts, and GeoJSON heatmaps.
 */

// Public endpoint to download sample CSV dataset for viva live upload demonstration
router.get('/sample/download', downloadSampleCSV);

// All other dataset routes are protected by JWT authentication
router.use(protect);

// Upload dataset (POST /api/datasets)
router.post('/', upload.single('file'), uploadDataset);

// List owned datasets (GET /api/datasets)
router.get('/', getDatasets);

// Get single dataset preview & metadata (GET /api/datasets/:id)
router.get('/:id', getDatasetById);

// Rename dataset (PATCH /api/datasets/:id)
router.patch('/:id', updateDataset);

// Delete dataset (DELETE /api/datasets/:id)
router.delete('/:id', deleteDataset);

// Analytics: Calculated statistics (GET /api/datasets/:id/statistics)
router.get('/:id/statistics', getDatasetStatistics);

// Analytics: Chart series data (GET /api/datasets/:id/chart)
router.get('/:id/chart', getDatasetChartData);

// Analytics: Mapbox Heatmap GeoJSON (GET /api/datasets/:id/geojson)
router.get('/:id/geojson', getDatasetGeoJSON);

// Download dataset CSV file (GET /api/datasets/:id/download)
router.get('/:id/download', downloadDatasetCSV);

export default router;
