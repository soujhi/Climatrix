import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, SlidersHorizontal, Plus, ChevronDown, X, Trash2, Eye, Edit3, BarChart2, Download, GitCompare } from 'lucide-react';

export default function Datasets({ onNavigate, onUploadClick, onExploreCorrelation }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDataset, setSelectedDataset] = useState(null); // Preview modal dataset
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');

  const fetchDatasets = async () => {
    try {
      const res = await api.get('/datasets');
      if (res.data.success) {
        setDatasets(res.data.data);
      }
    } catch (err) {
      console.error('[Fetch Datasets Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDownload = async (ds) => {
    try {
      const res = await api.get(`/datasets/${ds._id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${(ds.name || 'dataset').replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Failed to download CSV dataset');
    }
  };

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
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;
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
    try {
      const res = await api.get(`/datasets/${id}`);
      if (res.data.success) {
        setSelectedDataset(res.data.data);
      }
    } catch (err) {
      alert('Failed to fetch dataset preview');
    }
  };

  const filtered = datasets.filter(
    (ds) =>
      ds.name.toLowerCase().includes(search.toLowerCase()) ||
      ds.originalFileName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F4F1' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}
          >
            Datasets Management
          </h1>
          <p className="text-sm" style={{ color: '#8B8B97' }}>
            {datasets.length} total datasets stored in MongoDB
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/india_climate_dataset_2026.csv"
            download="india_climate_dataset_2026.csv"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border bg-white shadow-xs transition-colors hover:bg-slate-50"
            style={{ borderColor: '#E4E2DC', color: '#156272', fontFamily: "'DM Sans', sans-serif" }}
          >
            <Download size={15} />
            <span>Download India CSV</span>
          </a>
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 shadow-sm"
            style={{ backgroundColor: '#156272', color: '#fff', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1A7D8A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#156272'; }}
          >
            <Plus size={16} strokeWidth={2.2} />
            Upload Dataset
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={15} strokeWidth={1.8} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B8B97' }} />
          <input
            type="text"
            placeholder="Search datasets by name or file…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-150 shadow-sm"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #E4E2DC',
              color: '#0D1117',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={13} style={{ color: '#8B8B97' }} />
            </button>
          )}
        </div>
      </div>

      {/* Datasets Table */}
      <div
        className="rounded-xl overflow-hidden shadow-sm"
        style={{ backgroundColor: '#fff', border: '1px solid #E4E2DC' }}
      >
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid #F0EEE9', backgroundColor: '#FAFAF9' }}>
              {['Dataset Name', 'File Name', 'Rows / Cols', 'Parameters', 'Coordinates', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-xs font-medium uppercase tracking-wider"
                  style={{ color: '#8B8B97', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-400">
                  No datasets found. Click "Upload Dataset" to add a new CSV dataset.
                </td>
              </tr>
            ) : (
              filtered.map((ds, i) => (
                <tr
                  key={ds._id}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F0EEE9' : 'none' }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-5 py-4 font-medium text-sm text-slate-900">
                    {editingId === ds._id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="px-2 py-1 text-xs border rounded outline-none"
                        />
                        <button
                          onClick={() => handleRename(ds._id)}
                          className="px-2 py-1 bg-teal-700 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-slate-400">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{ds.name}</span>
                        <button
                          onClick={() => {
                            setEditingId(ds._id);
                            setNewName(ds.name);
                          }}
                          className="text-slate-400 hover:text-teal-700"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-slate-500">{ds.originalFileName}</td>
                  <td className="px-5 py-4 text-xs font-mono text-slate-700">
                    {ds.rowCount} / {ds.columnCount}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {ds.parameters.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: '#F0EEE9', color: '#4A4A52' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: ds.hasCoordinates ? '#F0FDF4' : '#F5F4F1',
                        color: ds.hasCoordinates ? '#16A34A' : '#8B8B97',
                      }}
                    >
                      {ds.hasCoordinates ? 'Yes (GeoJSON)' : 'No'}
                    </span>
                  </td>
                  <td className="px-5 py-4 flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(ds._id)}
                      className="p-1.5 rounded-lg border hover:bg-slate-100 text-slate-600 transition-colors"
                      title="Preview Rows"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (onExploreCorrelation) {
                          onExploreCorrelation(ds._id);
                        } else {
                          onNavigate('correlation');
                        }
                      }}
                      className="p-1.5 rounded-lg border hover:bg-teal-50 text-teal-700 transition-colors"
                      title="Explore Relationship (Correlation)"
                    >
                      <GitCompare size={14} />
                    </button>
                    <button
                      onClick={() => handleDownload(ds)}
                      className="p-1.5 rounded-lg border hover:bg-slate-100 text-slate-600 transition-colors"
                      title="Download CSV"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      onClick={() => onNavigate('analytics')}
                      className="p-1.5 rounded-lg border hover:bg-teal-50 text-teal-700 transition-colors"
                      title="Open Analytics"
                    >
                      <BarChart2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(ds._id)}
                      className="p-1.5 rounded-lg border hover:bg-rose-50 text-rose-600 transition-colors"
                      title="Delete Dataset"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Row Preview Modal */}
      {selectedDataset && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-xl border" style={{ borderColor: '#E4E2DC' }}>
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#F0EEE9' }}>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedDataset.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedDataset.originalFileName} • {selectedDataset.rowCount} total records</p>
              </div>
              <button onClick={() => setSelectedDataset(null)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#E4E2DC' }}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase font-semibold text-slate-500 border-b">
                    <tr>
                      {selectedDataset.columns.map((col) => (
                        <th key={col} className="px-4 py-3">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {selectedDataset.records.map((rec, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {selectedDataset.columns.map((col) => (
                          <td key={col} className="px-4 py-2.5 whitespace-nowrap">
                            {String(rec[col.toLowerCase()] ?? rec[col] ?? 'N/A')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 border-t bg-slate-50 flex items-center justify-between" style={{ borderColor: '#F0EEE9' }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedDataset)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border bg-white text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
                  style={{ borderColor: '#E4E2DC' }}
                >
                  <Download size={13} style={{ color: '#156272' }} />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => {
                    const id = selectedDataset._id;
                    setSelectedDataset(null);
                    if (onExploreCorrelation) {
                      onExploreCorrelation(id);
                    } else {
                      onNavigate('correlation');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 shadow-xs"
                  style={{ backgroundColor: '#156272' }}
                >
                  <GitCompare size={13} />
                  <span>Explore Relationship</span>
                </button>
              </div>
              <button
                onClick={() => setSelectedDataset(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border text-slate-700 hover:bg-slate-100"
                style={{ borderColor: '#E4E2DC' }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
