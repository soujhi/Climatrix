import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Database, FileText, Layers, Clock, Plus, ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#16A34A', bg: '#F0FDF4' },
  processing: { label: 'Processing', color: '#D97706', bg: '#FFFBEB' },
  error: { label: 'Error', color: '#DC2626', bg: '#FEF2F2' },
};

export default function Dashboard({ onNavigate, onUploadClick }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDataset, setActiveDataset] = useState(null);
  const [activeParam, setActiveParam] = useState('temperature');
  const [chartData, setChartData] = useState([]);

  // Fetch all user datasets on mount
  const fetchDatasets = async () => {
    try {
      const res = await api.get('/datasets');
      if (res.data.success) {
        setDatasets(res.data.data);
        if (res.data.data.length > 0) {
          setActiveDataset(res.data.data[0]);
          if (res.data.data[0].parameters.length > 0) {
            setActiveParam(res.data.data[0].parameters[0]);
          }
        }
      }
    } catch (err) {
      console.error('[Dashboard Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  // Load chart time series when active dataset or parameter changes
  useEffect(() => {
    if (!activeDataset) return;
    const fetchChart = async () => {
      try {
        const res = await api.get(`/datasets/${activeDataset._id}/chart?parameter=${activeParam}`);
        if (res.data.success) {
          setChartData(res.data.data.timeSeries);
        }
      } catch (err) {
        console.error('[Chart Error]', err);
      }
    };
    fetchChart();
  }, [activeDataset, activeParam]);

  const totalRecords = datasets.reduce((acc, curr) => acc + (curr.rowCount || 0), 0);
  const totalParameters = new Set(datasets.flatMap((d) => d.parameters || [])).size;

  const metrics = [
    { label: 'Datasets', value: datasets.length.toString(), change: '+Active', up: true, icon: Database },
    { label: 'Total Records', value: totalRecords.toLocaleString(), change: 'Parsed Rows', up: true, icon: FileText },
    { label: 'Variables', value: totalParameters.toString(), change: 'Detected', icon: Layers },
    { label: 'Platform Status', value: 'Operational', change: null, icon: Clock },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F4F1' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}
          >
            {greeting}, Researcher.
          </h1>
          <p className="text-sm" style={{ color: '#8B8B97' }}>
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/india_climate_dataset_2026.csv"
            download="india_climate_dataset_2026.csv"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border bg-white shadow-xs transition-colors hover:bg-slate-50"
            style={{ borderColor: '#E4E2DC', color: '#156272', fontFamily: "'DM Sans', sans-serif" }}
          >
            <span>Download Sample CSV</span>
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metrics.map(({ label, value, change, up, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{ backgroundColor: '#fff', border: '1px solid #E4E2DC', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8B8B97', letterSpacing: '0.08em', fontFamily: "'DM Sans', sans-serif" }}>
                {label}
              </span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F5F4F1' }}>
                <Icon size={15} strokeWidth={1.8} style={{ color: '#8B8B97' }} />
              </div>
            </div>
            <p className="text-2xl font-semibold mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
              {value}
            </p>
            {change && (
              <div className="flex items-center gap-1">
                <ArrowUpRight size={13} style={{ color: '#16A34A' }} />
                <span className="text-xs font-medium" style={{ color: '#16A34A' }}>
                  {change}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Primary Climate Trend Chart */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ backgroundColor: '#fff', border: '1px solid #E4E2DC', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-semibold mb-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
              Climate Parameter Overview
            </h2>
            <p className="text-xs" style={{ color: '#8B8B97' }}>
              {activeDataset ? `${activeDataset.name} • ${activeParam}` : 'Select dataset to view trend analysis'}
            </p>
          </div>

          {activeDataset && (
            <div className="flex items-center gap-3">
              {/* Dataset Selector */}
              <select
                value={activeDataset._id}
                onChange={(e) => {
                  const ds = datasets.find((d) => d._id === e.target.value);
                  setActiveDataset(ds);
                  if (ds && ds.parameters.length > 0) setActiveParam(ds.parameters[0]);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border outline-none cursor-pointer"
                style={{ backgroundColor: '#F5F4F1', borderColor: '#E4E2DC', color: '#0D1117', fontFamily: "'DM Sans', sans-serif" }}
              >
                {datasets.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>

              {/* Variable Selector */}
              <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#F5F4F1' }}>
                {activeDataset.parameters.map((p) => (
                  <button
                    key={p}
                    onClick={() => setActiveParam(p)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 capitalize"
                    style={{
                      backgroundColor: activeParam === p ? '#fff' : 'transparent',
                      color: activeParam === p ? '#0D1117' : '#8B8B97',
                      boxShadow: activeParam === p ? '0 1px 2px 0 rgb(0 0 0 / 0.06)' : 'none',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-64 w-full">
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#156272" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#156272" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8B8B97', fontFamily: "'DM Sans', sans-serif" }}
                  axisLine={false}
                  tickLine={false}
                  dx={-4}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#E4E2DC', borderRadius: '12px', boxShadow: '0 4px 16px 0 rgb(0 0 0 / 0.08)' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#156272"
                  strokeWidth={2}
                  fill="url(#gradPrimary)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#156272', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No climate time-series records available for chart rendering.
            </div>
          )}
        </div>
      </div>

      {/* Recent Datasets Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#fff', border: '1px solid #E4E2DC', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.04)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#F0EEE9' }}>
          <h2 className="text-base font-semibold" style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}>
            Recent Datasets
          </h2>
          <button
            onClick={() => onNavigate('datasets')}
            className="text-xs font-medium transition-colors duration-150"
            style={{ color: '#156272', fontFamily: "'DM Sans', sans-serif" }}
          >
            View all datasets →
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid #F0EEE9', backgroundColor: '#FAFAF9' }}>
              {['Dataset Name', 'Original File', 'Records', 'Variables', 'Coordinates', 'Uploaded'].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3.5 text-xs font-medium uppercase tracking-wider"
                  style={{ color: '#8B8B97', letterSpacing: '0.07em', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datasets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                  No datasets uploaded yet. Click "Upload Dataset" to add your first CSV file.
                </td>
              </tr>
            ) : (
              datasets.slice(0, 5).map((ds, i) => (
                <tr
                  key={ds._id}
                  onClick={() => onNavigate('analytics')}
                  className="transition-colors duration-100 cursor-pointer"
                  style={{ borderBottom: i < datasets.length - 1 ? '1px solid #F0EEE9' : 'none' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAFAF9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <td className="px-6 py-4 font-medium text-sm" style={{ color: '#0D1117' }}>
                    {ds.name}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono" style={{ color: '#8B8B97' }}>
                    {ds.originalFileName}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono" style={{ color: '#4A4A52' }}>
                    {ds.rowCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1 flex-wrap">
                      {ds.parameters.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: '#F0EEE9', color: '#4A4A52' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: ds.hasCoordinates ? '#F0FDF4' : '#F5F4F1',
                        color: ds.hasCoordinates ? '#16A34A' : '#8B8B97',
                      }}
                    >
                      {ds.hasCoordinates ? 'GeoJSON Ready' : 'Tabular'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs" style={{ color: '#8B8B97' }}>
                    {new Date(ds.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
