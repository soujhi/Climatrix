import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { MapboxHeatmap } from './MapboxHeatmap';
import { MapPin, Layers, ChevronDown, Compass, Calendar, BarChart2, CloudRain, Thermometer, Wind, Droplets, RotateCcw } from 'lucide-react';

export default function Geospatial({ onUploadClick }) {
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [selectedParam, setSelectedParam] = useState('temperature');
  const [selectedCity, setSelectedCity] = useState('all');
  const [availableCities, setAvailableCities] = useState([]);
  const [geojsonData, setGeojsonData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all datasets
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await api.get('/datasets');
        if (res.data.success && res.data.data.length > 0) {
          setDatasets(res.data.data);
          const geoDs = res.data.data.find(d => d.hasCoordinates) || res.data.data[0];
          setSelectedDatasetId(geoDs._id);
        }
      } catch (err) {
        console.error('[Geospatial Error]', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  // Fetch GeoJSON for selected dataset, parameter, and city
  useEffect(() => {
    if (!selectedDatasetId) return;

    const loadGeoData = async () => {
      setLoading(true);
      try {
        const metaRes = await api.get(`/datasets/${selectedDatasetId}`);
        const datasetMeta = metaRes.data.data;
        setSelectedDataset(datasetMeta);

        const cities = datasetMeta.locations && datasetMeta.locations.length > 0
          ? datasetMeta.locations
          : Array.from(new Set((datasetMeta.records || []).map((r) => r.location).filter(Boolean))).sort();
        setAvailableCities(cities);

        const currentParam = datasetMeta.parameters.includes(selectedParam)
          ? selectedParam
          : datasetMeta.parameters[0] || 'temperature';
        setSelectedParam(currentParam);

        if (datasetMeta.hasCoordinates) {
          const locationQuery = selectedCity && selectedCity !== 'all' ? `&location=${encodeURIComponent(selectedCity)}` : '';
          const geoRes = await api.get(`/datasets/${selectedDatasetId}/geojson?parameter=${currentParam}${locationQuery}`);
          if (geoRes.data.success) {
            setGeojsonData(geoRes.data.data);
          }
        } else {
          setGeojsonData(null);
        }
      } catch (err) {
        console.error('[Geospatial Load Error]', err);
      } finally {
        setLoading(false);
      }
    };

    loadGeoData();
  }, [selectedDatasetId, selectedParam, selectedCity]);

  const getMetricIcon = (param) => {
    switch (param.toLowerCase()) {
      case 'temperature': return Thermometer;
      case 'rainfall': return CloudRain;
      case 'humidity': return Droplets;
      case 'wind_speed': return Wind;
      default: return BarChart2;
    }
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F4F1' }}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}
          >
            Geospatial Heatmap Explorer
          </h1>
          <p className="text-sm" style={{ color: '#8B8B97' }}>
            Mapbox GL JS geographic rendering, spatial heat density, and city-level observation inspection.
          </p>
        </div>

        {/* Dataset & City Selectors Top Toolbar */}
        {datasets.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Dataset Selector */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-white shadow-xs" style={{ borderColor: '#E4E2DC' }}>
              <span className="text-xs font-medium" style={{ color: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}>Dataset:</span>
              <select
                value={selectedDatasetId}
                onChange={(e) => {
                  setSelectedDatasetId(e.target.value);
                  setSelectedCity('all');
                }}
                className="text-xs font-semibold outline-none bg-transparent cursor-pointer"
                style={{ color: '#0D1117', fontFamily: "'DM Sans', sans-serif" }}
              >
                {datasets.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} {d.hasCoordinates ? '📍' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* City Selector */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl border bg-white shadow-xs" style={{ borderColor: '#E4E2DC' }}>
              <MapPin size={13} style={{ color: '#156272' }} />
              <span className="text-xs font-medium" style={{ color: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}>City:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="text-xs font-semibold outline-none bg-transparent cursor-pointer"
                style={{ color: selectedCity !== 'all' ? '#156272' : '#0D1117', fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="all">All Cities</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    📍 {city}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Metric Selector Bar & Quick Stats */}
      {selectedDataset && (
        <div
          className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl mb-6 border shadow-xs bg-white"
          style={{ borderColor: '#E4E2DC' }}
        >
          {/* Parameter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium mr-1" style={{ color: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}>
              Active Metric:
            </span>
            {selectedDataset.parameters.map((param) => {
              const Icon = getMetricIcon(param);
              const active = selectedParam === param;
              return (
                <button
                  key={param}
                  onClick={() => setSelectedParam(param)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all shadow-xs"
                  style={{
                    backgroundColor: active ? '#156272' : '#F5F4F1',
                    color: active ? '#fff' : '#4A4A52',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <Icon size={13} />
                  <span className="capitalize">{param}</span>
                </button>
              );
            })}
          </div>

          {/* Dataset Geo Metadata Pills */}
          <div className="flex items-center gap-3 text-xs">
            {selectedCity !== 'all' && (
              <button
                onClick={() => setSelectedCity('all')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs border transition-colors hover:bg-slate-50"
                style={{ borderColor: '#E4E2DC', color: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}
              >
                <RotateCcw size={11} />
                <span>Reset to All</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-slate-50" style={{ borderColor: '#E4E2DC' }}>
              <MapPin size={13} style={{ color: '#156272' }} />
              <span className="text-slate-600 font-medium">
                {geojsonData?.features?.length || 0} Stations Mapped {selectedCity !== 'all' ? `in ${selectedCity}` : ''}
              </span>
            </div>
            {selectedDataset.hasCoordinates && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                GeoJSON Live
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Map Card */}
      <div
        className="rounded-2xl p-6 border shadow-xs bg-white"
        style={{ borderColor: '#E4E2DC' }}
      >
        <MapboxHeatmap
          geojsonData={geojsonData}
          selectedParameter={selectedParam}
          hasCoordinates={selectedDataset ? selectedDataset.hasCoordinates : false}
          height="560px"
        />
      </div>
    </div>
  );
}
