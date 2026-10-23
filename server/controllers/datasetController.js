import fs from 'fs';
import Dataset from '../models/Dataset.js';
import { parseAndValidateCSV } from '../utils/csvParser.js';
import { calculateFieldStatistics } from '../utils/statsEngine.js';

/**
 * DATASET CONTROLLER (C - Express Controller)
 * Handles CSV upload, metadata management, filtered statistics, chart data, and GeoJSON export.
 */

// @desc    Upload & parse CSV dataset
// @route   POST /api/datasets
// @access  Private
export const uploadDataset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
    }

    const filePath = req.file.path;
    const originalFileName = req.file.originalname;
    const datasetName = req.body.name || originalFileName.replace(/\.[^/.]+$/, '');

    // Parse and validate CSV contents
    const parsedData = await parseAndValidateCSV(filePath);

    // Save Dataset to MongoDB
    const dataset = await Dataset.create({
      userId: req.user._id,
      name: datasetName,
      originalFileName,
      columns: parsedData.columns,
      parameters: parsedData.parameters,
      rowCount: parsedData.rowCount,
      columnCount: parsedData.columnCount,
      missingValueCount: parsedData.missingValueCount,
      dateRange: parsedData.dateRange,
      hasCoordinates: parsedData.hasCoordinates,
      records: parsedData.records,
    });

    // Clean up temporary uploaded file from disk
    fs.unlink(filePath, (err) => {
      if (err) console.error('[File Cleanup Warning]', err);
    });

    return res.status(201).json({
      success: true,
      message: 'Dataset uploaded and validated successfully',
      data: {
        _id: dataset._id,
        name: dataset.name,
        originalFileName: dataset.originalFileName,
        columns: dataset.columns,
        parameters: dataset.parameters,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        missingValueCount: dataset.missingValueCount,
        dateRange: dataset.dateRange,
        hasCoordinates: dataset.hasCoordinates,
        uploadedAt: dataset.createdAt,
      },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all datasets owned by authenticated user
// @route   GET /api/datasets
// @access  Private
export const getDatasets = async (req, res) => {
  try {
    const datasets = await Dataset.find({ userId: req.user._id })
      .select('-records')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: datasets.length,
      data: datasets,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get dataset details & preview rows (paginated)
// @route   GET /api/datasets/:id
// @access  Private
export const getDatasetById = async (req, res) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found or unauthorized' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const previewRecords = dataset.records.slice(startIndex, endIndex);

    const uniqueLocations = Array.from(
      new Set(
        (dataset.records || [])
          .map((r) => (r.location ? r.location.toString().trim() : ''))
          .filter((loc) => loc.length > 0)
      )
    ).sort();

    return res.status(200).json({
      success: true,
      data: {
        _id: dataset._id,
        name: dataset.name,
        originalFileName: dataset.originalFileName,
        columns: dataset.columns,
        parameters: dataset.parameters,
        locations: uniqueLocations,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        missingValueCount: dataset.missingValueCount,
        dateRange: dataset.dateRange,
        hasCoordinates: dataset.hasCoordinates,
        createdAt: dataset.createdAt,
        pagination: {
          total: dataset.rowCount,
          page,
          limit,
          totalPages: Math.ceil(dataset.rowCount / limit),
        },
        records: previewRecords,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Rename dataset
// @route   PATCH /api/datasets/:id
// @access  Private
export const updateDataset = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'New dataset name is required' });
    }

    const dataset = await Dataset.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name: name.trim() },
      { new: true }
    ).select('-records');

    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found or unauthorized' });
    }

    return res.status(200).json({ success: true, data: dataset });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete dataset
// @route   DELETE /api/datasets/:id
// @access  Private
export const deleteDataset = async (req, res) => {
  try {
    const dataset = await Dataset.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found or unauthorized' });
    }

    return res.status(200).json({ success: true, message: 'Dataset deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Filter dataset records by date & location query params
const filterRecords = (records, query) => {
  const { startDate, endDate, location } = query;
  return (records || []).filter((r) => {
    let matchesDate = true;
    let matchesLocation = true;

    if (startDate && r.date) {
      matchesDate = matchesDate && new Date(r.date) >= new Date(startDate);
    }
    if (endDate && r.date) {
      matchesDate = matchesDate && new Date(r.date) <= new Date(endDate);
    }
    if (location && location !== 'all' && location.trim() !== '') {
      matchesLocation = Boolean(
        r.location && r.location.toLowerCase() === location.toLowerCase().trim()
      );
    }

    return matchesDate && matchesLocation;
  });
};

// @desc    Calculate statistical engine metrics (count, min, max, mean, median, stdDev)
// @route   GET /api/datasets/:id/statistics
// @access  Private
export const getDatasetStatistics = async (req, res) => {
  try {
    const { parameter } = req.query;
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found or unauthorized' });
    }

    const filteredRecords = filterRecords(dataset.records, req.query);

    // If parameter specified, compute stats for it. Otherwise compute for all parameters.
    const statsResult = {};

    const targetParams = parameter ? [parameter] : dataset.parameters;

    targetParams.forEach((param) => {
      const values = filteredRecords.map((r) => r[param] ?? (r.additionalData ? r.additionalData.get(param) : null));
      statsResult[param] = calculateFieldStatistics(values);
    });

    return res.status(200).json({
      success: true,
      data: {
        totalRecordsEvaluated: filteredRecords.length,
        statistics: statsResult,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get chart-ready formatted series data
// @route   GET /api/datasets/:id/chart
// @access  Private
export const getDatasetChartData = async (req, res) => {
  try {
    const { parameter, groupBy } = req.query; // parameter: e.g. 'temperature', groupBy: 'date' | 'month' | 'location'
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found or unauthorized' });
    }

    const selectedParam = parameter || (dataset.parameters.length > 0 ? dataset.parameters[0] : 'temperature');
    const filteredRecords = filterRecords(dataset.records, req.query);

    // Line Chart Data (sorted by date)
    const timeSeries = filteredRecords
      .filter((r) => r.date && r[selectedParam] !== null && r[selectedParam] !== undefined)
      .map((r) => ({
        date: r.date ? new Date(r.date).toISOString().split('T')[0] : 'N/A',
        location: r.location || 'Unknown',
        value: r[selectedParam],
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Grouped Bar Chart Data (e.g. monthly average or location average)
    const groupedMap = {};
    const hasSpecificLocation = Boolean(req.query.location && req.query.location !== 'all' && req.query.location.trim() !== '');

    filteredRecords.forEach((r) => {
      let groupKey = 'All';
      if (groupBy === 'month' && r.date) {
        groupKey = new Date(r.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      } else if (hasSpecificLocation && r.date) {
        groupKey = new Date(r.date).toISOString().split('T')[0];
      } else if (r.location) {
        groupKey = r.location;
      }

      if (!groupedMap[groupKey]) {
        groupedMap[groupKey] = { sum: 0, count: 0 };
      }
      if (r[selectedParam] !== null && r[selectedParam] !== undefined) {
        groupedMap[groupKey].sum += r[selectedParam];
        groupedMap[groupKey].count += 1;
      }
    });

    const barSeries = Object.keys(groupedMap).map((key) => ({
      name: key,
      average: groupedMap[key].count > 0 ? parseFloat((groupedMap[key].sum / groupedMap[key].count).toFixed(2)) : 0,
      count: groupedMap[key].count,
    }));

    // Scatter Plot Data (Relationship e.g. temperature vs humidity if available)
    const scatterParamY = req.query.scatterParamY || (dataset.parameters.find((p) => p !== selectedParam) || selectedParam);
    const scatterSeries = filteredRecords
      .filter((r) => r[selectedParam] !== null && r[scatterParamY] !== null)
      .map((r) => ({
        x: r[selectedParam],
        y: r[scatterParamY],
        location: r.location || 'N/A',
        date: r.date ? new Date(r.date).toISOString().split('T')[0] : 'N/A',
      }));

    return res.status(200).json({
      success: true,
      data: {
        parameter: selectedParam,
        scatterParamY,
        timeSeries,
        barSeries,
        scatterSeries,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get GeoJSON feature collection for Mapbox Heatmap layer
// @route   GET /api/datasets/:id/geojson
// @access  Private
export const getDatasetGeoJSON = async (req, res) => {
  try {
    const { parameter } = req.query;
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found or unauthorized' });
    }

    if (!dataset.hasCoordinates) {
      return res.status(400).json({
        success: false,
        hasCoordinates: false,
        message: 'This dataset does not contain valid latitude and longitude coordinates.',
      });
    }

    const selectedParam = parameter || (dataset.parameters.length > 0 ? dataset.parameters[0] : 'temperature');
    const filteredRecords = filterRecords(dataset.records, req.query);

    const features = filteredRecords
      .filter((r) => r.latitude !== null && r.longitude !== null)
      .map((r) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [r.longitude, r.latitude], // GeoJSON uses [lng, lat] order!
        },
        properties: {
          id: r._id,
          location: r.location || 'Unspecified Location',
          date: r.date ? new Date(r.date).toISOString().split('T')[0] : 'N/A',
          parameter: selectedParam,
          value: r[selectedParam] ?? 0,
          temperature: r.temperature,
          rainfall: r.rainfall,
          humidity: r.humidity,
          wind_speed: r.wind_speed,
        },
      }));

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    return res.status(200).json({
      success: true,
      hasCoordinates: true,
      parameter: selectedParam,
      data: geojson,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download dataset records as CSV file
// @route   GET /api/datasets/:id/download
// @access  Private
export const downloadDatasetCSV = async (req, res) => {
  try {
    const dataset = await Dataset.findOne({ _id: req.params.id, userId: req.user._id });
    if (!dataset) {
      return res.status(404).json({ success: false, message: 'Dataset not found or unauthorized' });
    }

    const columns = dataset.columns && dataset.columns.length > 0
      ? dataset.columns
      : ['date', 'location', 'latitude', 'longitude', 'temperature', 'rainfall', 'humidity', 'wind_speed'];

    let csvContent = columns.join(',') + '\n';

    (dataset.records || []).forEach((r) => {
      const rowValues = columns.map((col) => {
        const key = col.toLowerCase();
        let val = r[key] ?? r[col] ?? '';
        if (key === 'date' && val) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) val = d.toISOString().split('T')[0];
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvContent += rowValues.join(',') + '\n';
    });

    const safeName = dataset.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download sample CSV dataset for immediate live demonstration
// @route   GET /api/datasets/sample/download
// @access  Public
export const downloadSampleCSV = async (req, res) => {
  try {
    const csvPath = './sample_data/india_climate_dataset_2026.csv';
    if (fs.existsSync(csvPath)) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="climatrix_india_climate_sample.csv"');
      return fs.createReadStream(csvPath).pipe(res);
    }
    return res.status(404).json({ success: false, message: 'Sample dataset file not found' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

