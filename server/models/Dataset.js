import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory dataset store for instant local testing when MongoDB service is not running
const localDatasetStore = new Map();

// Helper to seed the All-India dataset so the app has data ready immediately
const seedSampleDataset = () => {
  try {
    const csvPath = path.resolve(__dirname, '../../sample_data/india_climate_dataset_2026.csv');
    if (!fs.existsSync(csvPath)) return;
    const content = fs.readFileSync(csvPath, 'utf8').trim();
    const lines = content.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) return;

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const records = [];
    const locationsSet = new Set();

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = vals[idx];
      });

      const parsedRow = {
        date: row.date ? new Date(row.date) : null,
        location: row.location || '',
        latitude: row.latitude ? parseFloat(row.latitude) : null,
        longitude: row.longitude ? parseFloat(row.longitude) : null,
        temperature: row.temperature ? parseFloat(row.temperature) : null,
        rainfall: row.rainfall ? parseFloat(row.rainfall) : null,
        humidity: row.humidity ? parseFloat(row.humidity) : null,
        wind_speed: row.wind_speed ? parseFloat(row.wind_speed) : null,
        additionalData: {},
      };
      if (parsedRow.location) locationsSet.add(parsedRow.location);
      records.push(parsedRow);
    }

    const defaultDs = {
      _id: 'ds_all_india_2026',
      userId: 'all',
      name: 'All-India Climate Survey 2026',
      originalFileName: 'india_climate_dataset_2026.csv',
      columns: headers,
      parameters: ['temperature', 'rainfall', 'humidity', 'wind_speed'],
      locations: Array.from(locationsSet).sort(),
      rowCount: records.length,
      columnCount: headers.length,
      missingValueCount: 0,
      dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-10') },
      hasCoordinates: true,
      records: records,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    localDatasetStore.set('ds_all_india_2026', defaultDs);
  } catch (err) {
    console.error('[Seed Dataset Error]', err.message);
  }
};
seedSampleDataset();

class DatasetModelMock {
  static async create(data) {
    const id = 'ds_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const newDs = {
      _id: id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    localDatasetStore.set(id, newDs);
    return newDs;
  }

  static find(query = {}) {
    let results = Array.from(localDatasetStore.values());
    if (query.userId) {
      results = results.filter((d) => d.userId === 'all' || d.userId.toString() === query.userId.toString());
    }
    return {
      select: () => ({
        sort: () => results,
      }),
    };
  }

  static async findOne(query) {
    if (query._id) {
      const ds = localDatasetStore.get(query._id.toString());
      if (ds && query.userId && ds.userId !== 'all' && ds.userId.toString() !== query.userId.toString()) {
        return null;
      }
      return ds;
    }
    return null;
  }

  static async findOneAndUpdate(query, update) {
    const ds = await DatasetModelMock.findOne(query);
    if (!ds) return null;
    if (update.name) ds.name = update.name;
    localDatasetStore.set(ds._id, ds);
    return {
      select: () => ds,
    };
  }

  static async findOneAndDelete(query) {
    const ds = await DatasetModelMock.findOne(query);
    if (!ds) return null;
    localDatasetStore.delete(ds._id);
    return ds;
  }
}

const getDatasetModel = () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const recordSchema = new mongoose.Schema(
      {
        date: { type: Date, default: null },
        location: { type: String, default: '' },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        temperature: { type: Number, default: null },
        rainfall: { type: Number, default: null },
        humidity: { type: Number, default: null },
        wind_speed: { type: Number, default: null },
        additionalData: { type: Map, of: mongoose.Schema.Types.Mixed },
      },
      { _id: true }
    );

    const datasetSchema = new mongoose.Schema(
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true, trim: true },
        originalFileName: { type: String, required: true },
        columns: [{ type: String }],
        parameters: [{ type: String }],
        rowCount: { type: Number, default: 0 },
        columnCount: { type: Number, default: 0 },
        missingValueCount: { type: Number, default: 0 },
        dateRange: { start: { type: Date, default: null }, end: { type: Date, default: null } },
        hasCoordinates: { type: Boolean, default: false },
        records: [recordSchema],
      },
      { timestamps: true }
    );
    return mongoose.models.Dataset || mongoose.model('Dataset', datasetSchema);
  }
  return DatasetModelMock;
};

export const DatasetProxy = new Proxy(
  {},
  {
    get(target, prop) {
      const model = getDatasetModel();
      return model[prop];
    },
  }
);

export default DatasetProxy;
