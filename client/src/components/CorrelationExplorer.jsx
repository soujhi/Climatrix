import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  GitCompare,
  Play,
  BookmarkPlus,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  Info,
  ChevronDown,
  RotateCcw,
  Sparkles,
  ExternalLink,
  X,
  Loader2,
} from 'lucide-react';

export default function CorrelationExplorer({ initialDatasetId = null, onNavigate }) {
  const [datasets, setDatasets] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);

  // Source A selections
  const [selectedDatasetA, setSelectedDatasetA] = useState('');
  const [selectedFieldA, setSelectedFieldA] = useState('');
  const [selectedLocationA, setSelectedLocationA] = useState('all');

  // Source B selections
  const [selectedDatasetB, setSelectedDatasetB] = useState('');
  const [selectedFieldB, setSelectedFieldB] = useState('');
  const [selectedLocationB, setSelectedLocationB] = useState('all');

  // Filters & Methods
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [method, setMethod] = useState('pearson');

  // Execution states
  const [isCalculating, setIsCalculating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Save to Workspace Modal
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('');
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Load accessible datasets & workspaces
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dsRes, wsRes] = await Promise.all([
          api.get('/datasets'),
          api.get('/workspaces'),
        ]);

        if (dsRes.data.success && dsRes.data.data.length > 0) {
          const dsList = dsRes.data.data;
          setDatasets(dsList);

          const defaultDsId = initialDatasetId && dsList.some((d) => d._id === initialDatasetId)
            ? initialDatasetId
            : dsList[0]._id;

          setSelectedDatasetA(defaultDsId);
          setSelectedDatasetB(defaultDsId);

          const targetDs = dsList.find((d) => d._id === defaultDsId);
          if (targetDs?.parameters?.length > 0) {
            setSelectedFieldA(targetDs.parameters[0]);
            setSelectedFieldB(targetDs.parameters[1] || targetDs.parameters[0]);
          }
        }

        if (wsRes.data.success) {
          setWorkspaces(wsRes.data.data);
          if (wsRes.data.data.length > 0) {
            setTargetWorkspaceId(wsRes.data.data[0]._id);
          }
        }
      } catch (err) {
        console.error('[Correlation Init Error]', err);
      } finally {
        setLoadingDatasets(false);
      }
    };

    fetchData();
  }, [initialDatasetId]);

  // Derived dataset objects
  const datasetObjA = datasets.find((d) => d._id === selectedDatasetA);
  const datasetObjB = datasets.find((d) => d._id === selectedDatasetB);

  // Available locations
  const locationsA = datasetObjA?.locations || [];
  const locationsB = datasetObjB?.locations || [];

  // When dataset A changes, ensure field is valid
  useEffect(() => {
    if (datasetObjA?.parameters?.length > 0 && !datasetObjA.parameters.includes(selectedFieldA)) {
      setSelectedFieldA(datasetObjA.parameters[0]);
    }
  }, [selectedDatasetA, datasetObjA]);

  // When dataset B changes, ensure field is valid
  useEffect(() => {
    if (datasetObjB?.parameters?.length > 0 && !datasetObjB.parameters.includes(selectedFieldB)) {
      setSelectedFieldB(datasetObjB.parameters[0]);
    }
  }, [selectedDatasetB, datasetObjB]);

  // Run Correlation Analysis
  const handleRunAnalysis = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDatasetA || !selectedFieldA || !selectedDatasetB || !selectedFieldB) {
      setErrorMessage('Please configure both Source A and Source B datasets and variables.');
      return;
    }

    setIsCalculating(true);
    setErrorMessage('');
    setAnalysisResult(null);
    setSaveSuccessMsg('');

    try {
      const payload = {
        sourceA: {
          datasetId: selectedDatasetA,
          field: selectedFieldA,
          location: selectedLocationA,
        },
        sourceB: {
          datasetId: selectedDatasetB,
          field: selectedFieldB,
          location: selectedLocationB,
        },
        dateRange: {
          start: startDate || undefined,
          end: endDate || undefined,
        },
        method,
        alignmentPolicy: 'exact_date',
        missingPolicy: 'pairwise_complete',
      };

      const res = await api.post('/analyses/correlation', payload);
      if (res.data.success) {
        setAnalysisResult(res.data.data);
        // Pre-fill suggested title
        const locLabel =
          selectedLocationA !== 'all' && selectedLocationA === selectedLocationB
            ? ` (${selectedLocationA})`
            : '';
        setAnalysisTitle(
          `${selectedFieldA.toUpperCase()} vs ${selectedFieldB.toUpperCase()}${locLabel} Correlation`
        );
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to compute correlation analysis.'
      );
    } finally {
      setIsCalculating(false);
    }
  };

  // Save Snapshot to Workspace
  const handleSaveToWorkspace = async (e) => {
    e.preventDefault();
    if (!targetWorkspaceId) {
      alert('Please select a target workspace.');
      return;
    }
    if (!analysisTitle.trim()) {
      alert('Please provide a title for this analysis snapshot.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: analysisTitle.trim(),
        analysisType: 'correlation',
        sourceA: analysisResult.sourceA,
        sourceB: analysisResult.sourceB,
        dateRange: analysisResult.dateRange,
        alignmentPolicy: analysisResult.alignmentPolicy,
        missingPolicy: analysisResult.missingPolicy,
        method: analysisResult.method,
        coefficient: analysisResult.coefficient,
        sampleCount: analysisResult.sampleCount,
        excludedCount: analysisResult.excludedCount,
        strengthLabel: analysisResult.strengthLabel,
        strengthBand: analysisResult.strengthBand,
        direction: analysisResult.direction,
        scatterPoints: analysisResult.scatterPoints,
        timeSeriesPoints: analysisResult.timeSeriesPoints,
        caveats: analysisResult.caveats,
      };

      const res = await api.post(`/workspaces/${targetWorkspaceId}/analyses`, payload);
      if (res.data.success) {
        setSaveSuccessMsg(`Analysis successfully saved to workspace!`);
        setIsSaveModalOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save analysis to workspace.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper badge color for correlation strength
  const getBadgeStyle = (band, direction) => {
    if (band === 'strong') {
      return direction === 'Positive'
        ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }
        : { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    }
    if (band === 'moderate') {
      return { bg: '#F0FDFA', text: '#0D9488', border: '#99F6E4' };
    }
    if (band === 'weak') {
      return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
    }
    return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' };
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F4F1' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
              style={{ backgroundColor: '#EAF4F6', color: '#156272', letterSpacing: '0.08em' }}
            >
              Feature 4 • Empirical Insights
            </span>
          </div>
          <h1
            className="text-2xl font-semibold mb-1"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}
          >
            Climate Event Correlation Explorer
          </h1>
          <p className="text-sm" style={{ color: '#8B8B97' }}>
            Investigate mathematical linear associations between multi-variate climate variables with exact-date alignment, pairwise completeness, and descriptive categorization.
          </p>
        </div>

        {workspaces.length > 0 && (
          <button
            onClick={() => onNavigate && onNavigate('workspaces')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border bg-white shadow-xs transition-colors hover:bg-slate-50"
            style={{ borderColor: '#E4E2DC', color: '#4A4A52', fontFamily: "'DM Sans', sans-serif" }}
          >
            <Layers size={14} style={{ color: '#156272' }} />
            <span>View Research Workspaces ({workspaces.length})</span>
          </button>
        )}
      </div>

      {/* Analysis Configuration Builder Card */}
      <div
        className="bg-white rounded-2xl p-6 mb-8 border shadow-xs"
        style={{ borderColor: '#E4E2DC' }}
      >
        <div className="border-b pb-4 mb-6 flex items-center justify-between" style={{ borderColor: '#F0EEE9' }}>
          <div>
            <h2 className="text-base font-semibold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Analysis Configuration
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select two climate variables across matching dates to compute bivariate co-variation.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Pairwise-Complete Policy</span>
          </div>
        </div>

        <form onSubmit={handleRunAnalysis} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SOURCE A */}
            <div className="p-4 rounded-xl border bg-slate-50/60 space-y-3.5" style={{ borderColor: '#E4E2DC' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Variable A (Independent X)
                </span>
                {datasetObjA && (
                  <span className="text-[11px] font-mono text-slate-500">
                    {datasetObjA.rowCount} total rows
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dataset</label>
                <div className="relative">
                  <select
                    value={selectedDatasetA}
                    onChange={(e) => setSelectedDatasetA(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  >
                    {datasets.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.rowCount} rows)
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parameter</label>
                  <div className="relative">
                    <select
                      value={selectedFieldA}
                      onChange={(e) => setSelectedFieldA(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs bg-white border outline-none capitalize font-medium"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      {(datasetObjA?.parameters || []).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Location Filter</label>
                  <div className="relative">
                    <select
                      value={selectedLocationA}
                      onChange={(e) => setSelectedLocationA(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs bg-white border outline-none"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      <option value="all">All Locations</option>
                      {locationsA.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* SOURCE B */}
            <div className="p-4 rounded-xl border bg-slate-50/60 space-y-3.5" style={{ borderColor: '#E4E2DC' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Variable B (Dependent Y)
                </span>
                {datasetObjB && (
                  <span className="text-[11px] font-mono text-slate-500">
                    {datasetObjB.rowCount} total rows
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dataset</label>
                <div className="relative">
                  <select
                    value={selectedDatasetB}
                    onChange={(e) => setSelectedDatasetB(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  >
                    {datasets.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.rowCount} rows)
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Parameter</label>
                  <div className="relative">
                    <select
                      value={selectedFieldB}
                      onChange={(e) => setSelectedFieldB(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs bg-white border outline-none capitalize font-medium"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      {(datasetObjB?.parameters || []).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Location Filter</label>
                  <div className="relative">
                    <select
                      value={selectedLocationB}
                      onChange={(e) => setSelectedLocationB(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs bg-white border outline-none"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      <option value="all">All Locations</option>
                      {locationsB.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Temporal Alignment & Execution Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t" style={{ borderColor: '#F0EEE9' }}>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-slate-600 font-medium">Date Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border bg-white outline-none text-slate-700"
                  style={{ borderColor: '#E4E2DC' }}
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-1.5 rounded-lg border bg-white outline-none text-slate-700"
                  style={{ borderColor: '#E4E2DC' }}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-medium">Method:</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border bg-white outline-none font-medium"
                  style={{ borderColor: '#E4E2DC', color: '#156272' }}
                >
                  <option value="pearson">Pearson Linear Correlation (r)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSelectedLocationA('all');
                  setSelectedLocationB('all');
                  setAnalysisResult(null);
                  setErrorMessage('');
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium border bg-white text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                style={{ borderColor: '#E4E2DC' }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>

              <button
                type="submit"
                disabled={isCalculating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all duration-150 disabled:opacity-50"
                style={{ backgroundColor: '#156272', fontFamily: "'DM Sans', sans-serif" }}
              >
                {isCalculating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Computing Correlation...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="#fff" />
                    <span>Run Correlation Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error / Validation Alert */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-xl flex items-center gap-2.5 mb-8 shadow-xs">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl flex items-center justify-between mb-8 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('workspaces')}
            className="font-semibold underline hover:text-emerald-900"
          >
            Open Workspaces →
          </button>
        </div>
      )}

      {/* Non-valid result explanation */}
      {analysisResult && !analysisResult.valid && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-5 rounded-2xl mb-8 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <AlertCircle size={16} />
            <span>Correlation Cannot Be Evaluated</span>
          </div>
          <p className="text-slate-700">{analysisResult.reason}</p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 pt-2 border-t border-amber-200/60">
            <span>Matched Pairs: {analysisResult.sampleCount}</span>
            <span>Excluded Pairs: {analysisResult.excludedCount}</span>
            <span>Policy: {analysisResult.alignmentPolicy}</span>
          </div>
        </div>
      )}

      {/* Valid Analysis Results Display */}
      {analysisResult && analysisResult.valid && (
        <div className="space-y-8">
          {/* Results Header Card */}
          <div
            className="bg-white rounded-2xl p-6 border shadow-xs flex flex-wrap items-center justify-between gap-4"
            style={{ borderColor: '#E4E2DC' }}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono text-slate-400">
                  Calculated {new Date(analysisResult.calculatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-mono text-slate-500">
                  {analysisResult.dateRange.start} to {analysisResult.dateRange.end}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {analysisResult.sourceA.field.toUpperCase()} ({analysisResult.sourceA.unit}) vs{' '}
                {analysisResult.sourceB.field.toUpperCase()} ({analysisResult.sourceB.unit})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Source A: {analysisResult.sourceA.datasetName} ({analysisResult.sourceA.location}) • Source B:{' '}
                {analysisResult.sourceB.datasetName} ({analysisResult.sourceB.location})
              </p>
            </div>

            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all duration-150"
              style={{ backgroundColor: '#156272', fontFamily: "'DM Sans', sans-serif" }}
            >
              <BookmarkPlus size={15} />
              <span>Save to Workspace</span>
            </button>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Card 1: Pearson r */}
            <div
              className="bg-white rounded-xl p-5 border shadow-xs"
              style={{ borderColor: '#E4E2DC' }}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2" style={{ letterSpacing: '0.08em' }}>
                Pearson Coefficient (r)
              </p>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-3xl font-semibold"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: analysisResult.coefficient > 0 ? '#0D9488' : analysisResult.coefficient < 0 ? '#2563EB' : '#4B5563',
                  }}
                >
                  {analysisResult.coefficient > 0 ? `+${analysisResult.coefficient}` : analysisResult.coefficient}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Bound range: -1.0000 to +1.0000</p>
            </div>

            {/* Card 2: Descriptive Strength */}
            <div
              className="bg-white rounded-xl p-5 border shadow-xs flex flex-col justify-between"
              style={{ borderColor: '#E4E2DC' }}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2" style={{ letterSpacing: '0.08em' }}>
                Association Strength
              </p>
              {(() => {
                const b = getBadgeStyle(analysisResult.strengthBand, analysisResult.direction);
                return (
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border w-fit"
                    style={{ backgroundColor: b.bg, color: b.text, borderColor: b.border }}
                  >
                    {analysisResult.direction} • {analysisResult.strengthLabel}
                  </span>
                );
              })()}
              <p className="text-[10px] text-slate-400 mt-2">Empirical classification heuristic</p>
            </div>

            {/* Card 3: Sample Size */}
            <div
              className="bg-white rounded-xl p-5 border shadow-xs"
              style={{ borderColor: '#E4E2DC' }}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2" style={{ letterSpacing: '0.08em' }}>
                Matched Sample Count (N)
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {analysisResult.sampleCount}
                </span>
                <span className="text-xs text-slate-500">pairs</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Exact temporal intersection</p>
            </div>

            {/* Card 4: Excluded Observations */}
            <div
              className="bg-white rounded-xl p-5 border shadow-xs"
              style={{ borderColor: '#E4E2DC' }}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2" style={{ letterSpacing: '0.08em' }}>
                Excluded Incomplete Rows
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {analysisResult.excludedCount}
                </span>
                <span className="text-xs text-slate-500">records</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Filtered by pairwise policy</p>
            </div>
          </div>

          {/* Visualizations Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1: Scatter Plot */}
            <div
              className="bg-white rounded-2xl p-6 border shadow-xs"
              style={{ borderColor: '#E4E2DC' }}
            >
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Bivariate Scatter Plot
                </h3>
                <p className="text-xs text-slate-500">
                  Individual matched observation points (X: {analysisResult.sourceA.field} vs Y: {analysisResult.sourceB.field})
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={analysisResult.sourceA.field}
                      unit={` ${analysisResult.sourceA.unit}`}
                      stroke="#8B8B97"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={analysisResult.sourceB.field}
                      unit={` ${analysisResult.sourceB.unit}`}
                      stroke="#8B8B97"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ payload }) => {
                        if (!payload || !payload.length) return null;
                        const pt = payload[0].payload;
                        return (
                          <div
                            className="bg-white p-3 rounded-xl shadow-lg border text-xs space-y-1 font-mono"
                            style={{ borderColor: '#E4E2DC' }}
                          >
                            <p className="font-semibold text-slate-900">
                              📅 {pt.date} {pt.location ? `• 📍 ${pt.location}` : ''}
                            </p>
                            <p className="text-teal-700">
                              {analysisResult.sourceA.field}: <strong>{pt.x} {analysisResult.sourceA.unit}</strong>
                            </p>
                            <p className="text-indigo-700">
                              {analysisResult.sourceB.field}: <strong>{pt.y} {analysisResult.sourceB.unit}</strong>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      name="Observations"
                      data={analysisResult.scatterPoints}
                      fill="#156272"
                      opacity={0.8}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Synchronized Dual-Axis Time Series */}
            <div
              className="bg-white rounded-2xl p-6 border shadow-xs"
              style={{ borderColor: '#E4E2DC' }}
            >
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Synchronized Temporal Context (Dual Y-Axes)
                </h3>
                <p className="text-xs text-slate-500">
                  Parallel time series preserving distinct physical units and scales over the observation period
                </p>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analysisResult.timeSeriesPoints} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" />
                    <XAxis
                      dataKey="date"
                      stroke="#8B8B97"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#156272"
                      fontSize={11}
                      tickLine={false}
                      domain={['auto', 'auto']}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#4F46E5"
                      fontSize={11}
                      tickLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      content={({ payload, label }) => {
                        if (!payload || !payload.length) return null;
                        return (
                          <div
                            className="bg-white p-3 rounded-xl shadow-lg border text-xs space-y-1 font-mono"
                            style={{ borderColor: '#E4E2DC' }}
                          >
                            <p className="font-semibold text-slate-900">📅 Date: {label}</p>
                            {payload.map((entry) => (
                              <p key={entry.name} style={{ color: entry.color }}>
                                {entry.name}: <strong>{entry.value}</strong>
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => (
                        <span className="text-xs capitalize font-medium text-slate-700">
                          {val}
                        </span>
                      )}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey={analysisResult.sourceA.field}
                      stroke="#156272"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey={analysisResult.sourceB.field}
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Scientific Caveats & Data-Quality Notice */}
          <div
            className="bg-white rounded-2xl p-6 border shadow-xs space-y-3"
            style={{ borderColor: '#E4E2DC' }}
          >
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <Info size={16} className="text-teal-700 shrink-0" />
              <span style={{ fontFamily: "'DM Sans', sans-serif" }}>Methodology & Interpretation Notes</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-3.5 rounded-xl border bg-slate-50/60" style={{ borderColor: '#E4E2DC' }}>
                <p className="font-semibold text-slate-800 mb-1">Statistical Caveat (Non-Causality)</p>
                <p>{analysisResult.caveats}</p>
              </div>
              <div className="p-3.5 rounded-xl border bg-slate-50/60" style={{ borderColor: '#E4E2DC' }}>
                <p className="font-semibold text-slate-800 mb-1">Data Quality & Exclusions</p>
                <p>
                  Pairwise completeness excluded <strong>{analysisResult.excludedCount}</strong> incomplete observation(s).{' '}
                  Matched <strong>{analysisResult.sampleCount}</strong> clean pairs covering dates{' '}
                  <strong>{analysisResult.dateRange.start}</strong> to <strong>{analysisResult.dateRange.end}</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save to Workspace Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-5"
            style={{ borderColor: '#E4E2DC' }}
          >
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: '#F0EEE9' }}>
              <div>
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Save Analysis to Research Workspace
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Persist configuration, math metrics, and visualization snapshots into a collaborative workspace.
                </p>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveToWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Workspace</label>
                {workspaces.length === 0 ? (
                  <p className="text-xs text-rose-600">
                    No workspaces found. Please create a workspace first before saving.
                  </p>
                ) : (
                  <div className="relative">
                    <select
                      value={targetWorkspaceId}
                      onChange={(e) => setTargetWorkspaceId(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs bg-white border outline-none font-medium"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      {workspaces.map((ws) => (
                        <option key={ws._id} value={ws._id}>
                          {ws.title} ({ws.userRole})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Analysis Snapshot Title</label>
                <input
                  type="text"
                  value={analysisTitle}
                  onChange={(e) => setAnalysisTitle(e.target.value)}
                  placeholder="e.g. Coastal Temperature vs Precipitation Anomaly"
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border text-xs space-y-1 font-mono text-slate-600" style={{ borderColor: '#E4E2DC' }}>
                <p>Coefficient: <strong>r = {analysisResult?.coefficient}</strong></p>
                <p>Sample Size: <strong>{analysisResult?.sampleCount} pairs</strong></p>
                <p>Variables: <strong>{analysisResult?.sourceA.field} & {analysisResult?.sourceB.field}</strong></p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: '#F0EEE9' }}>
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border text-slate-600 hover:bg-slate-50"
                  style={{ borderColor: '#E4E2DC' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || workspaces.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#156272' }}
                >
                  {isSaving ? 'Saving Snapshot...' : 'Confirm & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
