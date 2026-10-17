import React, { useState } from 'react';
import api from '../services/api';
import { UploadCloud, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles, X, Download } from 'lucide-react';

export default function UploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        if (!datasetName) {
          setDatasetName(droppedFile.name.replace(/\.[^/.]+$/, ''));
        }
        setError('');
      } else {
        setError('Only .csv dataset files are supported.');
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        if (!datasetName) {
          setDatasetName(selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
        setError('');
      } else {
        setError('Only .csv dataset files are supported.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV file to upload.');
      return;
    }

    setIsUploading(true);
    setError('');
    setValidationResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', datasetName || file.name);

    try {
      const res = await api.post('/datasets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setValidationResult(res.data.data);
        if (onSuccess) onSuccess(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload and validate dataset');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl border relative overflow-hidden space-y-6"
        style={{ borderColor: '#E4E2DC' }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1"
        >
          <X size={18} />
        </button>

        <div className="border-b pb-4" style={{ borderColor: '#F0EEE9' }}>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Upload Climate CSV Dataset
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automatic header detection, validation, coordinate range checks, and MERN persistence.
          </p>
        </div>

        {/* Downloadable sample dataset banner */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-50 text-xs" style={{ borderColor: '#E4E2DC' }}>
          <div className="flex items-center gap-2 text-slate-700">
            <Download size={15} style={{ color: '#156272' }} />
            <span>Ready-to-use: <strong>All-India Climate CSV</strong> (11 cities, 110 rows)</span>
          </div>
          <a
            href="/india_climate_dataset_2026.csv"
            download="india_climate_dataset_2026.csv"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 flex items-center gap-1.5 shadow-xs shrink-0"
            style={{ backgroundColor: '#156272' }}
          >
            <Download size={12} />
            <span>Download CSV</span>
          </a>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!validationResult ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3"
              style={{ borderColor: '#E4E2DC', backgroundColor: '#F5F4F1' }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
                style={{ backgroundColor: '#156272' }}
              >
                <UploadCloud size={24} color="#fff" />
              </div>
              <div>
                <p className="text-slate-900 font-semibold text-sm">
                  {file ? file.name : 'Drag & Drop your CSV file here'}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">Max file size: 10MB</p>
              </div>

              <label
                className="px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors"
                style={{ backgroundColor: '#ECEAE6', color: '#0D1117' }}
              >
                <span>Browse Computer</span>
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>

            {/* Display Title */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Dataset Title
              </label>
              <input
                type="text"
                placeholder="e.g., NOAA Surface Temperature 2026"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full border rounded-xl px-3.5 py-2.5 text-sm outline-none shadow-xs"
                style={{ borderColor: '#E4E2DC', backgroundColor: '#fff' }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isUploading || !file}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white transition-all shadow-sm flex items-center justify-center gap-2"
              style={{
                backgroundColor: isUploading || !file ? '#A3A3A3' : '#156272',
                cursor: isUploading || !file ? 'not-allowed' : 'pointer',
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Validating CSV & Saving to Database...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Upload & Parse Dataset</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Validation Success Summary Card */
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Upload & CSV Validation Successful!</h4>
                <p className="text-xs text-emerald-700">Dataset stored in MongoDB cleanly.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border" style={{ borderColor: '#E4E2DC' }}>
                <span className="text-slate-500">Rows Parsed</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{validationResult.rowCount}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border" style={{ borderColor: '#E4E2DC' }}>
                <span className="text-slate-500">Columns</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{validationResult.columnCount}</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-white"
                style={{ backgroundColor: '#156272' }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
