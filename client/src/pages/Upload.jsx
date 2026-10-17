import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

/**
 * UPLOAD PAGE (R - React Page Component)
 * Handles CSV dataset file selection, drag-and-drop, server-side structure validation & header detection.
 */
export const Upload = () => {
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
        setError('Only .csv files are supported.');
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
        setError('Only .csv files are supported.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV dataset file to upload.');
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
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload and validate CSV dataset');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-slate-700/80 pb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">CSV Dataset Upload</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload raw climate CSV files for automatic schema detection, validation, statistical analysis, and Mapbox geographic heatmaps.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 text-sm p-4 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!validationResult ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-700 hover:border-teal-500/60 bg-slate-800/60 hover:bg-slate-800/90 rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4"
          >
            <div className="p-4 bg-teal-500/10 text-teal-400 rounded-full border border-teal-500/20">
              <UploadCloud className="w-10 h-10" />
            </div>
            <div>
              <p className="text-slate-200 font-semibold text-base">
                {file ? file.name : 'Drag & Drop your CSV file here'}
              </p>
              <p className="text-slate-400 text-xs mt-1">or click below to browse from your computer (Max 10MB)</p>
            </div>

            <label className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors">
              <span>Choose File</span>
              <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>

          {/* Dataset Name Field */}
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-medium">Dataset Display Title</label>
            <input
              type="text"
              placeholder="e.g., Chennai Rainfall & Temperature Jan 2026"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading || !file}
            className={`w-full flex items-center justify-center space-x-2 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all ${
              isUploading || !file
                ? 'bg-slate-700 cursor-not-allowed opacity-60'
                : 'bg-teal-600 hover:bg-teal-500'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Validating & Parsing CSV Records...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Upload & Validate Dataset</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Validation Success Summary Card (Matching PRD 03 & 07 requirements) */
        <div className="bg-slate-800 border border-teal-500/40 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="flex items-center space-x-3 text-emerald-400 border-b border-slate-700 pb-4">
            <CheckCircle2 className="w-8 h-8 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-white">Dataset Uploaded & Validated Successfully!</h3>
              <p className="text-xs text-slate-400">All CSV checks passed cleanly.</p>
            </div>
          </div>

          {/* Metadata Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-400">Row Count</p>
              <p className="text-2xl font-bold text-teal-400 mt-1">{validationResult.rowCount}</p>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-400">Column Count</p>
              <p className="text-2xl font-bold text-teal-400 mt-1">{validationResult.columnCount}</p>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-400">Missing Values</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{validationResult.missingValueCount}</p>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-400">Coordinates Detected</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{validationResult.hasCoordinates ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Detected Climate Parameters */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detected Climate Parameters</p>
            <div className="flex flex-wrap gap-2">
              {validationResult.parameters.map((param) => (
                <span key={param} className="bg-teal-950 text-teal-300 text-xs px-3 py-1 rounded-lg border border-teal-800 font-medium">
                  {param}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-700">
            <button
              onClick={() => navigate(`/analytics?datasetId=${validationResult._id}`)}
              className="flex-1 inline-flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white font-medium py-3 rounded-xl transition-colors shadow-md"
            >
              <span>Proceed to Analytics & Heatmap</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setValidationResult(null);
                setFile(null);
                setDatasetName('');
              }}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Upload Another CSV
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
