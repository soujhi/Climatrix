import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { MapboxHeatmap } from '../components/MapboxHeatmap';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { BarChart3, Filter, Map, Calendar, MapPin, Calculator, Loader2 } from 'lucide-react';

/**
 * ANALYTICS PAGE (R - React Page Component)
 * Comprehensive analytics suite featuring compact filter controls, statistical metric cards (min, max, mean, median, stdDev),
 * Recharts visualizations (Line, Bar, Scatter), and Mapbox GL JS heatmaps.
 */
export const Analytics = () => {
  const [searchParams] = useSearchParams();
  const initialDatasetId = searchParams.get('datasetId');

  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState(initialDatasetId || '');
  const [selectedDataset, setSelectedDataset] = useState(null);
  
  // Filters
  const [selectedParameter, setSelectedParameter] = useState('temperature');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  
  // Data States
  const [statistics, setStatistics] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch available datasets
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await api.get('/datasets');
        if (res.data.success && res.data.data.length > 0) {
          setDatasets(res.data.data);
          if (!selectedDatasetId) {
            setSelectedDatasetId(res.data.data[0]._id);
          }
        }
      } catch (err) {
        console.error('[Analytics Error]', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  // Fetch analytics metrics whenever dataset or filter state updates
  useEffect(() => {
    if (!selectedDatasetId) return;

    const loadAnalyticsData = async () => {
      setLoading(true);
      try {
        // Fetch Dataset Metadata
        const metaRes = await api.get(`/datasets/${selectedDatasetId}`);
        const datasetMeta = metaRes.data.data;
        setSelectedDataset(datasetMeta);

        const currentParam = datasetMeta.parameters.includes(selectedParameter)
          ? selectedParameter
          : datasetMeta.parameters[0] || 'temperature';

        setSelectedParameter(currentParam);

        // Query params
        const params = new URLSearchParams({
          parameter: currentParam,
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
          ...(locationFilter && { location: locationFilter }),
        });

        // 1. Fetch Statistical Engine Metrics
        const statsRes = await api.get(`/datasets/${selectedDatasetId}/statistics?${params.toString()}`);
        if (statsRes.data.success) {
          setStatistics(statsRes.data.data.statistics[currentParam]);
        }

        // 2. Fetch Chart Series Data
        const chartRes = await api.get(`/datasets/${selectedDatasetId}/chart?${params.toString()}`);
        if (chartRes.data.success) {
          setChartData(chartRes.data.data);
        }

        // 3. Fetch Mapbox GeoJSON Data (if coordinates present)
        if (datasetMeta.hasCoordinates) {
          const geoRes = await api.get(`/datasets/${selectedDatasetId}/geojson?${params.toString()}`);
          if (geoRes.data.success) {
            setGeojsonData(geoRes.data.data);
          }
        } else {
          setGeojsonData(null);
        }

      } catch (err) {
        console.error('[Load Analytics Failed]', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [selectedDatasetId, selectedParameter, startDate, endDate, locationFilter]);

  if (loading && datasets.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Initializing Analytics Engine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Controls Top Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-teal-400" />
              <span>Climate Analytics & Heatmap Dashboard</span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">Filter, inspect statistics, and visualize temporal trends & spatial heatmaps.</p>
          </div>

          {/* Dataset Selector Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Active Dataset:</span>
            <select
              value={selectedDatasetId}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-teal-300 font-semibold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
            >
              {datasets.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.rowCount} rows)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Compact Filter Controls Bar */}
        {selectedDataset && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            
            {/* Climate Parameter Selector */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center space-x-1">
                <Calculator className="w-3.5 h-3.5 text-teal-400" />
                <span>Climate Metric</span>
              </label>
              <select
                value={selectedParameter}
                onChange={(e) => setSelectedParameter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500 capitalize"
              >
                {selectedDataset.parameters.map((param) => (
                  <option key={param} value={param}>
                    {param}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>End Date</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Location Search Filter */}
            <div className="space-y-1">
              <label className="text-slate-400 font-medium flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>Location Filter</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Chennai"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

          </div>
        )}
      </div>

      {/* Row of Statistic Cards (PRD 04 Specs: mean, min, max, stdDev, count) */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 text-center">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Count</p>
            <p className="text-xl font-bold text-white mt-1">{statistics.count}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 text-center">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Mean (Avg)</p>
            <p className="text-xl font-bold text-teal-400 mt-1">{statistics.mean}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 text-center">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Minimum</p>
            <p className="text-xl font-bold text-sky-400 mt-1">{statistics.min}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 text-center">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Maximum</p>
            <p className="text-xl font-bold text-rose-400 mt-1">{statistics.max}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 text-center">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Median</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">{statistics.median}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 text-center">
            <p className="text-[11px] text-slate-400 font-semibold uppercase">Std Dev</p>
            <p className="text-xl font-bold text-amber-400 mt-1">{statistics.stdDev}</p>
          </div>
        </div>
      )}

      {/* Visualizations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recharts Primary Trend Line Chart */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <h3 className="font-semibold text-white text-base capitalize">
              {selectedParameter} Trend Over Time
            </h3>
            <span className="text-[11px] bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-800 font-mono">
              Line Chart
            </span>
          </div>
          <div className="h-72 w-full pt-2">
            {chartData && chartData.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={selectedParameter}
                    stroke="#14b8a6"
                    strokeWidth={2.5}
                    dot={{ fill: '#14b8a6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No time-series date points found for current filters.
              </div>
            )}
          </div>
        </div>

        {/* Recharts Monthly / Location Grouped Bar Chart */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <h3 className="font-semibold text-white text-base capitalize">
              Grouped {selectedParameter} Comparisons
            </h3>
            <span className="text-[11px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
              Bar Chart
            </span>
          </div>
          <div className="h-72 w-full pt-2">
            {chartData && chartData.barSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.barSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="average" name={`Average ${selectedParameter}`} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No grouped comparison data available.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Mapbox Heatmap Section */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2">
            <Map className="w-5 h-5 text-teal-400" />
            <h3 className="font-semibold text-white text-base">
              Geographic Heatmap & Point Inspection ({selectedParameter})
            </h3>
          </div>
          <span className="text-[11px] bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-800 font-mono">
            Mapbox GL JS + GeoJSON
          </span>
        </div>

        <MapboxHeatmap
          geojsonData={geojsonData}
          selectedParameter={selectedParameter}
          hasCoordinates={selectedDataset ? selectedDataset.hasCoordinates : false}
        />
      </div>

    </div>
  );
};
