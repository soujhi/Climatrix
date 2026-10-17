import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Database, FileSpreadsheet, BarChart2, Layers, PlusCircle, ArrowUpRight, Calendar, MapPin, Loader2 } from 'lucide-react';

/**
 * DASHBOARD PAGE (R - React Page Component)
 * Overview screen showing dataset totals, record statistics, detected parameters, and quick dataset access cards.
 */
export const Dashboard = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const res = await api.get('/datasets');
        if (res.data.success) {
          setDatasets(res.data.data);
        }
      } catch (err) {
        console.error('[Dashboard Error]', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  // Compute aggregate stats across owned datasets
  const totalDatasets = datasets.length;
  const totalRecords = datasets.reduce((acc, curr) => acc + (curr.rowCount || 0), 0);
  const totalParameters = new Set(datasets.flatMap((d) => d.parameters || [])).size;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Loading Climatrix Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome & Summary Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Overview of uploaded climate datasets, record counts, and detected parameter metadata.</p>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Upload New Dataset</span>
        </button>
      </div>

      {/* Primary KPI Stat Cards (Matching PRD 04 Experience & Interface Specs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">DATASETS</p>
            <h3 className="text-3xl font-extrabold text-white mt-1">{totalDatasets}</h3>
            <p className="text-xs text-slate-500 mt-1">Active CSV Datasets</p>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
            <Database className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">RECORDS</p>
            <h3 className="text-3xl font-extrabold text-teal-400 mt-1">{totalRecords.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">Parsed Climate Data Rows</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PARAMETERS</p>
            <h3 className="text-3xl font-extrabold text-sky-400 mt-1">{totalParameters}</h3>
            <p className="text-xs text-slate-500 mt-1">Detected Climate Metrics</p>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <BarChart2 className="w-8 h-8" />
          </div>
        </div>

      </div>

      {/* Dataset Grid List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Datasets</h2>
          {datasets.length > 0 && (
            <button
              onClick={() => navigate('/datasets')}
              className="text-teal-400 hover:text-teal-300 text-xs font-medium flex items-center space-x-1"
            >
              <span>View All Datasets</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {datasets.length === 0 ? (
          <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl p-12 text-center space-y-4">
            <div className="inline-flex p-4 bg-slate-700/50 text-slate-400 rounded-full">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-slate-200 font-semibold text-base">No Datasets Uploaded Yet</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Get started by uploading your raw climate CSV dataset to generate statistics, charts, and Mapbox geographic heatmaps.
            </p>
            <button
              onClick={() => navigate('/upload')}
              className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Upload Your First Dataset</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((dataset) => (
              <div
                key={dataset._id}
                className="bg-slate-800/90 border border-slate-700 hover:border-teal-500/50 rounded-2xl p-5 transition-all shadow-md flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-slate-100 group-hover:text-teal-300 transition-colors line-clamp-1">
                      {dataset.name}
                    </h3>
                    {dataset.hasCoordinates ? (
                      <span className="text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>Map Ready</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                        Tabular
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono line-clamp-1">{dataset.originalFileName}</p>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {dataset.parameters.map((param) => (
                      <span key={param} className="bg-slate-900/80 text-teal-400 text-[11px] px-2 py-0.5 rounded border border-slate-700">
                        {param}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-700/60 pt-3 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dataset.rowCount} rows</span>
                  </div>
                  <button
                    onClick={() => navigate(`/analytics?datasetId=${dataset._id}`)}
                    className="text-teal-400 hover:text-teal-300 font-medium flex items-center space-x-1"
                  >
                    <span>Analyze</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
