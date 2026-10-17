import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { MapboxHeatmap } from '../components/MapboxHeatmap';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown, Map, BarChart2, MapPin, SlidersHorizontal, RotateCcw, Download } from 'lucide-react';

function StatCard({ label, value, unit, sub }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: '#fff', border: '1px solid #E4E2DC', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: '#8B8B97', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.08em' }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#0D1117' }}>
          {value}
        </span>
        <span className="text-sm" style={{ color: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}>{unit}</span>
      </div>
      {sub && <p className="text-xs mt-1" style={{ color: '#8B8B97' }}>{sub}</p>}
    </div>
  );
}

export default function Analytics() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedParam, setSelectedParam] = useState('temperature');
  const [selectedCity, setSelectedCity] = useState('all');
  const [availableCities, setAvailableCities] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch datasets on mount
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await api.get('/datasets');
        if (res.data.success && res.data.data.length > 0) {
          setDatasets(res.data.data);
          setSelectedDatasetId(res.data.data[0]._id);
        }
      } catch (err) {
        console.error('[Analytics Error]', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  // Fetch analytics metrics whenever dataset, parameter, or city updates
  useEffect(() => {
    if (!selectedDatasetId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const metaRes = await api.get(`/datasets/${selectedDatasetId}`);
        const datasetMeta = metaRes.data.data;
        setSelectedDataset(datasetMeta);

        // Update available cities from dataset
        const cities = datasetMeta.locations && datasetMeta.locations.length > 0
          ? datasetMeta.locations
          : Array.from(new Set((datasetMeta.records || []).map((r) => r.location).filter(Boolean))).sort();
        setAvailableCities(cities);

        // Verify active parameter
        const currentParam = datasetMeta.parameters.includes(selectedParam)
          ? selectedParam
          : datasetMeta.parameters[0] || 'temperature';
        setSelectedParam(currentParam);

        // Build query string with city/location filter if selected
        const locationQuery = selectedCity && selectedCity !== 'all' ? `&location=${encodeURIComponent(selectedCity)}` : '';

        // 1. Fetch Stats
        const statsRes = await api.get(`/datasets/${selectedDatasetId}/statistics?parameter=${currentParam}${locationQuery}`);
        if (statsRes.data.success) {
          setStatistics(statsRes.data.data.statistics[currentParam]);
        }

        // 2. Fetch Chart Data
        const chartRes = await api.get(`/datasets/${selectedDatasetId}/chart?parameter=${currentParam}${locationQuery}`);
        if (chartRes.data.success) {
          setChartData(chartRes.data.data);
        }

        // 3. Fetch GeoJSON (if coordinates available)
        if (datasetMeta.hasCoordinates) {
          const geoRes = await api.get(`/datasets/${selectedDatasetId}/geojson?parameter=${currentParam}${locationQuery}`);
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

    loadData();
  }, [selectedDatasetId, selectedParam, selectedCity]);

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F4F1' }}>
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold mb-1"
          style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}
        >
          Climate Analytics & Heatmaps
        </h1>
        <p className="text-sm" style={{ color: '#8B8B97' }}>
          Select specific cities or areas to generate localized statistics, temporal trends, and spatial heatmaps.
        </p>
      </div>

      {/* Control Bar: Dataset, Metric & City Selector */}
      {selectedDataset && (
        <div
          className="flex flex-wrap items-center gap-5 px-6 py-5 rounded-2xl mb-6 shadow-xs border bg-white"
          style={{ borderColor: '#E4E2DC' }}
        >
          {/* Dataset Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}>
              Active Dataset
            </label>
            <div className="relative">
              <select
                value={selectedDatasetId}
                onChange={(e) => {
                  setSelectedDatasetId(e.target.value);
                  setSelectedCity('all'); // Reset location filter on dataset switch
                }}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer border"
                style={{ backgroundColor: '#fff', borderColor: '#E4E2DC', color: '#0D1117', fontFamily: "'Inter', sans-serif", minWidth: 200 }}
              >
                {datasets.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8B8B97' }} />
            </div>
          </div>

          {/* Area / City Selector Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium flex items-center gap-1" style={{ color: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}>
              <MapPin size={12} style={{ color: '#156272' }} />
              <span>Area / City Filter</span>
            </label>
            <div className="relative">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer border font-medium"
                style={{
                  backgroundColor: selectedCity !== 'all' ? '#EAF4F6' : '#fff',
                  borderColor: selectedCity !== 'all' ? '#156272' : '#E4E2DC',
                  color: selectedCity !== 'all' ? '#156272' : '#0D1117',
                  fontFamily: "'Inter', sans-serif",
                  minWidth: 210,
                }}
              >
                <option value="all">All Cities & Areas (Dataset-wide)</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    📍 {city}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8B8B97' }} />
            </div>
          </div>

          {/* Metric Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}>
              Climate Metric
            </label>
            <div className="relative">
              <select
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer border capitalize"
                style={{ backgroundColor: '#fff', borderColor: '#E4E2DC', color: '#0D1117', fontFamily: "'Inter', sans-serif", minWidth: 160 }}
              >
                {selectedDataset.parameters.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8B8B97' }} />
            </div>
          </div>

          {/* Reset filter button if city is active */}
          {selectedCity !== 'all' && (
            <button
              onClick={() => setSelectedCity('all')}
              className="flex items-center gap-1.5 px-3 py-2 mt-auto text-xs font-medium rounded-xl border transition-colors hover:bg-slate-50"
              style={{ borderColor: '#E4E2DC', color: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}
            >
              <RotateCcw size={12} />
              <span>Show All Cities</span>
            </button>
          )}

          {/* Download CSV button */}
          <button
            onClick={async () => {
              if (!selectedDatasetId) return;
              try {
                const res = await api.get(`/datasets/${selectedDatasetId}/download`, { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `${(selectedDataset?.name || 'dataset').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
              } catch (err) {
                alert('Failed to download CSV');
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 mt-auto ml-auto text-xs font-medium rounded-xl border bg-white transition-colors hover:bg-slate-50 shadow-xs"
            style={{ borderColor: '#E4E2DC', color: '#156272', fontFamily: "'DM Sans', sans-serif" }}
            title="Download CSV for this dataset"
          >
            <Download size={13} />
            <span>Download CSV</span>
          </button>
        </div>
      )}

      {/* Stats Row */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            label="Count"
            value={statistics.count.toString()}
            unit="records"
            sub={selectedCity !== 'all' ? `${selectedCity} data points` : "Dataset-wide total"}
          />
          <StatCard
            label="Mean (Avg)"
            value={statistics.mean.toString()}
            unit={selectedParam}
            sub={selectedCity !== 'all' ? `${selectedCity} average` : "Dataset-wide average"}
          />
          <StatCard
            label="Minimum"
            value={statistics.min.toString()}
            unit={selectedParam}
            sub={selectedCity !== 'all' ? `Lowest in ${selectedCity}` : "Lowest recorded"}
          />
          <StatCard
            label="Maximum"
            value={statistics.max.toString()}
            unit={selectedParam}
            sub={selectedCity !== 'all' ? `Highest in ${selectedCity}` : "Highest recorded"}
          />
          <StatCard
            label="Std Deviation"
            value={statistics.stdDev.toString()}
            unit={selectedParam}
            sub={selectedCity !== 'all' ? `${selectedCity} variability` : "Data variability"}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Line Chart */}
        <div
          className="rounded-2xl p-6 border shadow-xs bg-white"
          style={{ borderColor: '#E4E2DC' }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold mb-0.5 capitalize" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
                {selectedParam} Temporal Trend {selectedCity !== 'all' ? `— ${selectedCity}` : ''}
              </h2>
              <p className="text-xs" style={{ color: '#8B8B97' }}>
                {selectedCity !== 'all' ? `Chronological records for ${selectedCity}` : 'Time-series evolution across all locations'}
              </p>
            </div>
            {selectedCity !== 'all' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                📍 {selectedCity}
              </span>
            )}
          </div>
          <div className="h-64 w-full">
            {chartData && chartData.timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.timeSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8B8B97' }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tick={{ fontSize: 11, fill: '#8B8B97' }} axisLine={false} tickLine={false} dx={-4} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E4E2DC', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="value" stroke="#156272" strokeWidth={2} dot={{ fill: '#156272', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No time-series records found for {selectedCity !== 'all' ? selectedCity : 'this selection'}.
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div
          className="rounded-2xl p-6 border shadow-xs bg-white"
          style={{ borderColor: '#E4E2DC' }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold mb-0.5 capitalize" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
                {selectedCity !== 'all' ? `${selectedCity} Daily Observations` : `Grouped ${selectedParam} by City`}
              </h2>
              <p className="text-xs" style={{ color: '#8B8B97' }}>
                {selectedCity !== 'all' ? `Daily values recorded at ${selectedCity}` : 'Location aggregated comparison across dataset'}
              </p>
            </div>
            {selectedCity !== 'all' && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                📍 {selectedCity}
              </span>
            )}
          </div>
          <div className="h-64 w-full">
            {chartData && chartData.barSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.barSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8B8B97' }} axisLine={false} tickLine={false} dy={8} />
                  <YAxis tick={{ fontSize: 11, fill: '#8B8B97' }} axisLine={false} tickLine={false} dx={-4} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#E4E2DC', borderRadius: '12px' }} />
                  <Bar dataKey="average" fill="#1A7D8A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No comparison records available for {selectedCity !== 'all' ? selectedCity : 'this selection'}.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Mapbox Heatmap Component */}
      <div
        className="rounded-2xl p-6 border shadow-xs bg-white"
        style={{ borderColor: '#E4E2DC' }}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: '#F0EEE9' }}>
          <h2 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
            <Map size={18} style={{ color: '#156272' }} />
            <span>Mapbox Heatmap & Stations ({selectedParam}){selectedCity !== 'all' ? ` • ${selectedCity}` : ''}</span>
          </h2>
          {selectedCity !== 'all' && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
              Filtered to {selectedCity}
            </span>
          )}
        </div>

        <MapboxHeatmap
          geojsonData={geojsonData}
          selectedParameter={selectedParam}
          hasCoordinates={selectedDataset ? selectedDataset.hasCoordinates : false}
        />
      </div>
    </div>
  );
}
