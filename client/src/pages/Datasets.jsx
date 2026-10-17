import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Database, FileSpreadsheet, MapPin, Calendar, Trash2, Edit3, BarChart2, Eye, Search, AlertCircle, Loader2 } from 'lucide-react';

/**
 * MY DATASETS PAGE (R - React Page Component)
 * Management screen to list, rename, preview row samples, and delete owned climate datasets.
 */
export const Datasets = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [selectedDataset, setSelectedDataset] = useState(null); // Preview modal state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const fetchDatasets = async () => {
    try {
      const res = await api.get('/datasets');
      if (res.data.success) {
        setDatasets(res.data.data);
      }
    } catch (err) {
      setError('Failed to fetch datasets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleRename = async (id) => {
    if (!newName.trim()) return;
    try {
      const res = await api.patch(`/datasets/${id}`, { name: newName });
      if (res.data.success) {
        setEditingId(null);
        fetchDatasets();
      }
    } catch (err) {
      alert('Failed to rename dataset');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this climate dataset?')) return;
    try {
      const res = await api.delete(`/datasets/${id}`);
      if (res.data.success) {
        setDatasets(datasets.filter((d) => d._id !== id));
      }
    } catch (err) {
      alert('Failed to delete dataset');
    }
  };

  const handlePreview = async (id) => {
    setPreviewLoading(true);
    try {
      const res = await api.get(`/datasets/${id}`);
      if (res.data.success) {
        setSelectedDataset(res.data.data);
      }
    } catch (err) {
      alert('Failed to load dataset preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const filteredDatasets = datasets.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.originalFileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Fetching Datasets...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dataset Management</h1>
          <p className="text-slate-400 text-sm mt-1">List, inspect row previews, edit metadata, or delete uploaded datasets.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Dataset List Table */}
      {filteredDatasets.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-8 text-center text-slate-400 text-sm">
          No datasets found matching your search.
        </div>
      ) : (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Dataset Name</th>
                  <th className="px-6 py-4">File Name</th>
                  <th className="px-6 py-4">Rows / Cols</th>
                  <th className="px-6 py-4">Parameters</th>
                  <th className="px-6 py-4">Coordinates</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredDatasets.map((dataset) => (
                  <tr key={dataset._id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-100">
                      {editingId === dataset._id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="bg-slate-900 border border-teal-500 rounded px-2 py-1 text-xs text-white"
                          />
                          <button
                            onClick={() => handleRename(dataset._id)}
                            className="bg-teal-600 text-white text-xs px-2 py-1 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-slate-400 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>{dataset.name}</span>
                          <button
                            onClick={() => {
                              setEditingId(dataset._id);
                              setNewName(dataset.name);
                            }}
                            className="text-slate-400 hover:text-teal-400"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{dataset.originalFileName}</td>
                    <td className="px-6 py-4">{dataset.rowCount} / {dataset.columnCount}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {dataset.parameters.map((p) => (
                          <span key={p} className="bg-slate-900 text-teal-400 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {dataset.hasCoordinates ? (
                        <span className="text-emerald-400 font-semibold text-xs flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>Yes</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handlePreview(dataset._id)}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs"
                        title="Preview Rows"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/analytics?datasetId=${dataset._id}`)}
                        className="p-1.5 bg-teal-600/20 hover:bg-teal-600/40 text-teal-300 rounded-lg text-xs"
                        title="Open Analytics"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dataset._id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs"
                        title="Delete Dataset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row Preview Modal */}
      {selectedDataset && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedDataset.name} (Preview First 20 Rows)</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedDataset.originalFileName} • {selectedDataset.rowCount} total rows</p>
              </div>
              <button
                onClick={() => setSelectedDataset(null)}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-auto flex-1">
              <div className="overflow-x-auto border border-slate-700 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 uppercase font-semibold text-slate-400">
                    <tr>
                      {selectedDataset.columns.map((col) => (
                        <th key={col} className="px-4 py-3 border-b border-slate-700">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 font-mono">
                    {selectedDataset.records.map((rec, i) => (
                      <tr key={i} className="hover:bg-slate-700/30">
                        {selectedDataset.columns.map((col) => {
                          const val = rec[col.toLowerCase()] ?? rec[col] ?? 'N/A';
                          return <td key={col} className="px-4 py-2.5 whitespace-nowrap">{String(val)}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-slate-700 bg-slate-900/60 flex justify-end">
              <button
                onClick={() => setSelectedDataset(null)}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-4 py-2 rounded-lg font-medium"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
