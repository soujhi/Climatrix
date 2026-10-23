import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory dataset store for instant local testing when MongoDB service is not running
const localDatasetStore = new Map();

// Helper to generate a multi-station dataset
const createDatasetRecords = (stations, dateCount = 10, startDate = '2026-01-01', generator) => {
  const records = [];
  const locationsSet = new Set();
  const baseDate = new Date(startDate);

  stations.forEach((station) => {
    locationsSet.add(station.name);
    for (let day = 0; day < dateCount; day++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + day);
      const metrics = generator(station, day);

      records.push({
        date: d,
        location: station.name,
        latitude: station.lat,
        longitude: station.lng,
        temperature: Number(metrics.temperature.toFixed(1)),
        rainfall: Number(metrics.rainfall.toFixed(1)),
        humidity: Number(metrics.humidity.toFixed(1)),
        wind_speed: Number(metrics.wind_speed.toFixed(1)),
        additionalData: {},
      });
    }
  });

  return { records, locations: Array.from(locationsSet).sort() };
};

// Seed 5 default India datasets
const seedDefaultDatasets = () => {
  try {
    // 1. All-India Climate Survey 2026 (From CSV or fallback generator)
    const csvPath = path.resolve(__dirname, '../../sample_data/india_climate_dataset_2026.csv');
    let allIndiaRecords = [];
    let allIndiaHeaders = ['date', 'location', 'latitude', 'longitude', 'temperature', 'rainfall', 'humidity', 'wind_speed'];
    let allIndiaLocations = [];

    if (fs.existsSync(csvPath)) {
      const content = fs.readFileSync(csvPath, 'utf8').trim();
      const lines = content.split(/\r?\n/).filter(Boolean);
      if (lines.length > 1) {
        allIndiaHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const locSet = new Set();
        for (let i = 1; i < lines.length; i++) {
          const vals = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const row = {};
          allIndiaHeaders.forEach((h, idx) => {
            row[h] = vals[idx];
          });
          const parsed = {
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
          if (parsed.location) locSet.add(parsed.location);
          allIndiaRecords.push(parsed);
        }
        allIndiaLocations = Array.from(locSet).sort();
      }
    }

    localDatasetStore.set('ds_all_india_2026', {
      _id: 'ds_all_india_2026',
      userId: 'all',
      name: 'All-India Climate Benchmark 2026',
      originalFileName: 'india_climate_dataset_2026.csv',
      columns: allIndiaHeaders,
      parameters: ['temperature', 'rainfall', 'humidity', 'wind_speed'],
      locations: allIndiaLocations,
      rowCount: allIndiaRecords.length,
      columnCount: allIndiaHeaders.length,
      missingValueCount: 0,
      dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-10') },
      hasCoordinates: true,
      records: allIndiaRecords,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 2. North India Monsoon & Heatwave 2026
    const northStations = [
      { name: 'Delhi', lat: 28.6139, lng: 77.2090, baseT: 34, baseR: 8, baseH: 58, baseW: 12 },
      { name: 'Jaipur', lat: 26.9124, lng: 75.7873, baseT: 38, baseR: 2, baseH: 42, baseW: 14 },
      { name: 'Lucknow', lat: 26.8467, lng: 80.9462, baseT: 33, baseR: 14, baseH: 68, baseW: 9 },
      { name: 'Chandigarh', lat: 30.7333, lng: 76.7794, baseT: 31, baseR: 12, baseH: 62, baseW: 11 },
      { name: 'Varanasi', lat: 25.3176, lng: 82.9739, baseT: 35, baseR: 6, baseH: 60, baseW: 8 },
      { name: 'Agra', lat: 27.1767, lng: 78.0081, baseT: 36, baseR: 4, baseH: 52, baseW: 10 },
      { name: 'Dehradun', lat: 30.3165, lng: 78.0322, baseT: 27, baseR: 28, baseH: 74, baseW: 13 },
    ];
    const northData = createDatasetRecords(northStations, 10, '2026-06-01', (st, day) => ({
      temperature: st.baseT + Math.sin(day * 0.8) * 3 - (day === 4 || day === 5 ? 5 : 0),
      rainfall: day === 4 || day === 5 ? st.baseR * 3.5 : Math.max(0, st.baseR + Math.cos(day) * 4),
      humidity: Math.min(95, Math.max(35, st.baseH + (day === 4 || day === 5 ? 20 : Math.sin(day) * 6))),
      wind_speed: Math.max(4, st.baseW + Math.sin(day * 1.2) * 4),
    }));

    localDatasetStore.set('ds_north_heatwave_2026', {
      _id: 'ds_north_heatwave_2026',
      userId: 'all',
      name: 'North India Monsoon & Extreme Heat 2026',
      originalFileName: 'north_india_climate_2026.csv',
      columns: allIndiaHeaders,
      parameters: ['temperature', 'rainfall', 'humidity', 'wind_speed'],
      locations: northData.locations,
      rowCount: northData.records.length,
      columnCount: allIndiaHeaders.length,
      missingValueCount: 0,
      dateRange: { start: new Date('2026-06-01'), end: new Date('2026-06-10') },
      hasCoordinates: true,
      records: northData.records,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 3. South India Coastal & Cyclone Surveillance 2026
    const southStations = [
      { name: 'Chennai', lat: 13.0827, lng: 80.2707, baseT: 30, baseR: 15, baseH: 80, baseW: 18 },
      { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, baseT: 29, baseR: 22, baseH: 85, baseW: 24 },
      { name: 'Kochi', lat: 9.9312, lng: 76.2673, baseT: 28, baseR: 35, baseH: 90, baseW: 16 },
      { name: 'Mangaluru', lat: 12.9141, lng: 74.8560, baseT: 28.5, baseR: 42, baseH: 88, baseW: 19 },
      { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366, baseT: 29.5, baseR: 18, baseH: 82, baseW: 14 },
      { name: 'Puducherry', lat: 11.9416, lng: 79.8083, baseT: 30.5, baseR: 12, baseH: 78, baseW: 15 },
      { name: 'Kozhikode', lat: 11.2588, lng: 75.7804, baseT: 28.2, baseR: 38, baseH: 89, baseW: 17 },
    ];
    const southData = createDatasetRecords(southStations, 10, '2026-10-01', (st, day) => ({
      temperature: st.baseT - (day >= 6 ? 3.5 : 0) + Math.cos(day * 0.7) * 1.5,
      rainfall: day >= 6 ? st.baseR * 2.8 : Math.max(0, st.baseR + Math.sin(day) * 8),
      humidity: Math.min(98, st.baseH + (day >= 6 ? 8 : Math.cos(day) * 4)),
      wind_speed: day >= 6 ? st.baseW + 16 : st.baseW + Math.sin(day) * 3,
    }));

    localDatasetStore.set('ds_south_coastal_2026', {
      _id: 'ds_south_coastal_2026',
      userId: 'all',
      name: 'South India Coastal & Cyclone Surveillance 2026',
      originalFileName: 'south_coastal_cyclone_2026.csv',
      columns: allIndiaHeaders,
      parameters: ['temperature', 'rainfall', 'humidity', 'wind_speed'],
      locations: southData.locations,
      rowCount: southData.records.length,
      columnCount: allIndiaHeaders.length,
      missingValueCount: 0,
      dateRange: { start: new Date('2026-10-01'), end: new Date('2026-10-10') },
      hasCoordinates: true,
      records: southData.records,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Western Ghats & Deccan Plateau 2026
    const westernStations = [
      { name: 'Pune', lat: 18.5204, lng: 73.8567, baseT: 26, baseR: 18, baseH: 72, baseW: 14 },
      { name: 'Mahabaleshwar', lat: 17.9237, lng: 73.6586, baseT: 19, baseR: 65, baseH: 94, baseW: 22 },
      { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, baseT: 25, baseR: 10, baseH: 68, baseW: 12 },
      { name: 'Mysuru', lat: 12.2958, lng: 76.6394, baseT: 26.5, baseR: 8, baseH: 65, baseW: 10 },
      { name: 'Ooty', lat: 11.4102, lng: 76.6950, baseT: 15, baseR: 32, baseH: 86, baseW: 16 },
      { name: 'Coimbatore', lat: 11.0168, lng: 76.9558, baseT: 29, baseR: 6, baseH: 60, baseW: 11 },
      { name: 'Nashik', lat: 19.9975, lng: 73.7898, baseT: 27, baseR: 14, baseH: 70, baseW: 13 },
    ];
    const westernData = createDatasetRecords(westernStations, 10, '2026-07-15', (st, day) => ({
      temperature: st.baseT + Math.sin(day * 0.9) * 2,
      rainfall: Math.max(0, st.baseR + Math.sin(day * 1.5) * 12),
      humidity: Math.min(98, Math.max(50, st.baseH + Math.cos(day) * 6)),
      wind_speed: Math.max(5, st.baseW + Math.sin(day) * 4),
    }));

    localDatasetStore.set('ds_western_ghats_2026', {
      _id: 'ds_western_ghats_2026',
      userId: 'all',
      name: 'Western Ghats & Deccan Plateau Climate 2026',
      originalFileName: 'western_ghats_climate_2026.csv',
      columns: allIndiaHeaders,
      parameters: ['temperature', 'rainfall', 'humidity', 'wind_speed'],
      locations: westernData.locations,
      rowCount: westernData.records.length,
      columnCount: allIndiaHeaders.length,
      missingValueCount: 0,
      dateRange: { start: new Date('2026-07-15'), end: new Date('2026-07-24') },
      hasCoordinates: true,
      records: westernData.records,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 5. Himalayan High-Altitude Weather Network 2026
    const himalayanStations = [
      { name: 'Shimla', lat: 31.1048, lng: 77.1734, baseT: 9, baseR: 12, baseH: 65, baseW: 14 },
      { name: 'Manali', lat: 32.2432, lng: 77.1892, baseT: 4, baseR: 18, baseH: 70, baseW: 16 },
      { name: 'Srinagar', lat: 34.0837, lng: 74.7973, baseT: 6, baseR: 10, baseH: 68, baseW: 11 },
      { name: 'Leh', lat: 34.1526, lng: 77.5771, baseT: -4, baseR: 1, baseH: 38, baseW: 22 },
      { name: 'Gangtok', lat: 27.3389, lng: 88.6065, baseT: 11, baseR: 24, baseH: 82, baseW: 12 },
      { name: 'Dharamshala', lat: 32.2190, lng: 76.3234, baseT: 13, baseR: 22, baseH: 72, baseW: 13 },
    ];
    const himalayanData = createDatasetRecords(himalayanStations, 10, '2026-02-01', (st, day) => ({
      temperature: st.baseT + Math.sin(day * 0.7) * 3,
      rainfall: Math.max(0, st.baseR + Math.cos(day) * 5),
      humidity: Math.min(90, Math.max(30, st.baseH + Math.sin(day) * 6)),
      wind_speed: Math.max(6, st.baseW + Math.sin(day * 1.4) * 6),
    }));

    localDatasetStore.set('ds_himalayan_2026', {
      _id: 'ds_himalayan_2026',
      userId: 'all',
      name: 'Himalayan High-Altitude Weather Network 2026',
      originalFileName: 'himalayan_weather_2026.csv',
      columns: allIndiaHeaders,
      parameters: ['temperature', 'rainfall', 'humidity', 'wind_speed'],
      locations: himalayanData.locations,
      rowCount: himalayanData.records.length,
      columnCount: allIndiaHeaders.length,
      missingValueCount: 0,
      dateRange: { start: new Date('2026-02-01'), end: new Date('2026-02-10') },
      hasCoordinates: true,
      records: himalayanData.records,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error('[Seed Default Datasets Error]', err.message);
  }
};

seedDefaultDatasets();

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
