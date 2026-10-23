import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
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
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  BarChart3,
  ScatterChart as ScatterIcon,
  Activity,
  ArrowUpDown,
  BookOpen,
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

  // Chart view mode: 'bars' (default & easiest to explain), 'scatter' (with trendline), 'timeline' (dual line)
  const [chartViewMode, setChartViewMode] = useState('bars');
  const [barSortOrder, setBarSortOrder] = useState('date'); // 'date' or 'sorted_a'

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

        if (dsRes.data?.success && dsRes.data.data.length > 0) {
          const dsList = dsRes.data.data;
          setDatasets(dsList);

          const defaultDsId =
            initialDatasetId && dsList.some((d) => d._id === initialDatasetId)
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

        if (wsRes.data?.success) {
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
      setErrorMessage('Please select variables for both Source A and Source B.');
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
      if (res.data?.success) {
        setAnalysisResult(res.data.data);
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
      if (res.data?.success) {
        setSaveSuccessMsg(`Analysis successfully saved to workspace!`);
        setIsSaveModalOpen(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save analysis to workspace.');
    } finally {
      setIsSaving(false);
    }
  };

  // Badge style helper
  const getBadgeStyle = (band, direction) => {
    if (band === 'strong') {
      return direction === 'Positive'
        ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }
        : { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
    }
    if (band === 'moderate') {
      return { bg: '#F0FDFA', text: '#0D9488', border: '#99F6E4' };
    }
    return { bg: '#F9FAFB', text: '#4B5563', border: '#E5E7EB' };
  };

  // Compute Linear Regression Trend Line
  const regression = useMemo(() => {
    if (!analysisResult?.scatterPoints || analysisResult.scatterPoints.length < 2) return null;
    const pts = analysisResult.scatterPoints;
    const n = pts.length;
    const sumX = pts.reduce((acc, p) => acc + p.x, 0);
    const sumY = pts.reduce((acc, p) => acc + p.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    let num = 0;
    let den = 0;
    pts.forEach((p) => {
      num += (p.x - meanX) * (p.y - meanY);
      den += (p.x - meanX) * (p.x - meanX);
    });

    if (den === 0) return null;
    const slope = num / den;
    const intercept = meanY - slope * meanX;

    const minX = Math.min(...pts.map((p) => p.x));
    const maxX = Math.max(...pts.map((p) => p.x));

    return {
      slope: Number(slope.toFixed(3)),
      intercept: Number(intercept.toFixed(2)),
      minX,
      maxX,
      minY: Number((slope * minX + intercept).toFixed(2)),
      maxY: Number((slope * maxX + intercept).toFixed(2)),
    };
  }, [analysisResult]);

  // Bar chart dataset (sorted or chronological)
  const barChartData = useMemo(() => {
    if (!analysisResult?.timeSeriesPoints) return [];
    const fieldA = analysisResult.sourceA.field;
    const fieldB = analysisResult.sourceB.field;

    const data = [...analysisResult.timeSeriesPoints].map((p) => ({
      date: p.date,
      location: p.location,
      [fieldA]: p[fieldA],
      [fieldB]: p[fieldB],
      dateShort: p.date ? p.date.slice(5) : '',
    }));

    if (barSortOrder === 'sorted_a') {
      data.sort((a, b) => (b[fieldA] ?? 0) - (a[fieldA] ?? 0));
    }

    return data.slice(0, 30); // Show up to 30 cleanest points for readable bars
  }, [analysisResult, barSortOrder]);

  // Key day highlights (highest and lowest of each parameter)
  const highlights = useMemo(() => {
    if (!analysisResult?.timeSeriesPoints || analysisResult.timeSeriesPoints.length === 0) return null;
    const fieldA = analysisResult.sourceA.field;
    const fieldB = analysisResult.sourceB.field;
    const pts = analysisResult.timeSeriesPoints;

    const maxA = [...pts].sort((a, b) => b[fieldA] - a[fieldA])[0];
    const minA = [...pts].sort((a, b) => a[fieldA] - b[fieldA])[0];
    const maxB = [...pts].sort((a, b) => b[fieldB] - a[fieldB])[0];

    return { maxA, minA, maxB };
  }, [analysisResult]);

  // Plain English Story Summary
  const getPlainEnglishStory = () => {
    if (!analysisResult) return null;
    const r = analysisResult.coefficient;
    const fA = analysisResult.sourceA.field;
    const fB = analysisResult.sourceB.field;

    if (r <= -0.3) {
      return {
        headline: `When ${fA.toUpperCase()} goes UP, ${fB.toUpperCase()} goes DOWN (Opposite Direction)`,
        direction: 'Opposite',
        color: '#2563EB',
        analogy: `Real-World Explanation: In meteorological physics, rain clouds and precipitation block direct sunlight and trigger evaporative cooling, which naturally causes ambient temperatures to drop on high-rainfall days.`,
      };
    } else if (r >= 0.3) {
      return {
        headline: `When ${fA.toUpperCase()} goes UP, ${fB.toUpperCase()} ALSO goes UP (Same Direction)`,
        direction: 'Same Direction',
        color: '#059669',
        analogy: `Real-World Explanation: Both atmospheric variables track each other closely over time, rising and falling during shared climatic cycles.`,
      };
    } else {
      return {
        headline: `No Clear Linear Pattern between ${fA.toUpperCase()} and ${fB.toUpperCase()}`,
        direction: 'Independent',
        color: '#4B5563',
        analogy: `Real-World Explanation: Daily variations in ${fA} do not reliably dictate or predict ${fB} across this observation period.`,
      };
    }
  };

  const story = getPlainEnglishStory();

  return (
    <div className="space-y-6">
      {/* Configuration Header Card */}
      <div
        className="bg-white rounded-2xl p-6 border shadow-xs"
        style={{ borderColor: '#E4E2DC' }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
            style={{ backgroundColor: '#156272' }}
          >
            <GitCompare size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Climate Event Correlation Explorer
            </h1>
            <p className="text-xs text-slate-500">
              Select two climate parameters to analyze their statistical relationship and view intuitive, easy-to-explain charts.
            </p>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleRunAnalysis} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Variable A Selection */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ backgroundColor: '#FBFBFA', borderColor: '#E4E2DC' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ backgroundColor: '#156272' }}
                >
                  X
                </span>
                <span className="text-xs font-semibold text-slate-800">Primary Variable (Variable X)</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dataset</label>
                <div className="relative">
                  <select
                    value={selectedDatasetA}
                    onChange={(e) => setSelectedDatasetA(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs bg-white border outline-none font-medium"
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
                  <label className="block text-xs font-medium text-slate-600 mb-1">City / Station</label>
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

            {/* Variable B Selection */}
            <div
              className="p-4 rounded-xl border space-y-3"
              style={{ backgroundColor: '#FBFBFA', borderColor: '#E4E2DC' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ backgroundColor: '#4F46E5' }}
                >
                  Y
                </span>
                <span className="text-xs font-semibold text-slate-800">Comparison Variable (Variable Y)</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dataset</label>
                <div className="relative">
                  <select
                    value={selectedDatasetB}
                    onChange={(e) => setSelectedDatasetB(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs bg-white border outline-none font-medium"
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
                  <label className="block text-xs font-medium text-slate-600 mb-1">City / Station</label>
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

          {/* Temporal Alignment & Controls */}
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
                <span className="px-2.5 py-1 rounded-lg border bg-slate-50 font-medium text-teal-800" style={{ borderColor: '#E4E2DC' }}>
                  Pearson Linear Correlation (r)
                </span>
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
                    <span>Analyzing Data...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="#fff" />
                    <span>Calculate & Explain Correlation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-4 rounded-xl flex items-center gap-2.5 shadow-xs">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl flex items-center justify-between shadow-xs">
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
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-5 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <AlertCircle size={16} />
            <span>Correlation Cannot Be Evaluated</span>
          </div>
          <p className="text-slate-700">{analysisResult.reason}</p>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500 pt-2 border-t border-amber-200/60">
            <span>Matched Pairs: {analysisResult.sampleCount}</span>
            <span>Excluded Pairs: {analysisResult.excludedCount}</span>
          </div>
        </div>
      )}

      {/* Valid Analysis Results Display */}
      {analysisResult && analysisResult.valid && (
        <div className="space-y-6">
          {/* 1. PLAIN ENGLISH STORY BANNER */}
          {story && (
            <div
              className="rounded-2xl p-6 border shadow-sm transition-all space-y-3"
              style={{ backgroundColor: '#F8FCFD', borderColor: '#BFE4EA' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: '#156272' }}
                  >
                    {analysisResult.coefficient < 0 ? (
                      <TrendingDown size={18} />
                    ) : (
                      <TrendingUp size={18} />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800">
                      Plain-English Key Finding
                    </span>
                    <h2
                      className="text-base sm:text-lg font-bold text-slate-900"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {story.headline}
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setIsSaveModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ backgroundColor: '#156272' }}
                >
                  <BookmarkPlus size={14} />
                  <span>Save to Workspace</span>
                </button>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-white/80 p-3.5 rounded-xl border border-teal-100">
                {story.analogy}
              </p>
            </div>
          )}

          {/* 2. VISUAL RELATIONSHIP GAUGE */}
          <div
            className="bg-white rounded-2xl p-6 border shadow-xs space-y-4"
            style={{ borderColor: '#E4E2DC' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Visual Relationship Meter (Gauge)
                </h3>
                <p className="text-xs text-slate-500">
                  Where your result lands on the standardized correlation spectrum (-1.0 to +1.0)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Pearson r:</span>
                <span
                  className="px-3 py-1 rounded-lg text-sm font-bold font-mono text-white"
                  style={{ backgroundColor: analysisResult.coefficient < 0 ? '#2563EB' : '#059669' }}
                >
                  {analysisResult.coefficient > 0 ? `+${analysisResult.coefficient}` : analysisResult.coefficient}
                </span>
              </div>
            </div>

            {/* Horizontal Meter Bar */}
            <div className="space-y-2 pt-2">
              <div className="relative h-6 w-full rounded-full overflow-hidden bg-gradient-to-r from-blue-500 via-slate-200 to-teal-500 shadow-inner">
                {/* Center Zero Marker */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-400 -translate-x-1/2 opacity-70 z-0" />
              </div>

              {/* Needle Indicator */}
              <div className="relative h-6 w-full">
                {(() => {
                  // Normalize -1.0 to 1.0 to a 0% to 100% position
                  const percent = Math.min(
                    100,
                    Math.max(0, ((analysisResult.coefficient + 1) / 2) * 100)
                  );
                  return (
                    <div
                      className="absolute -top-3 flex flex-col items-center -translate-x-1/2 transition-all duration-300"
                      style={{ left: `${percent}%` }}
                    >
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-900" />
                      <div className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold shadow-md whitespace-nowrap">
                        Your r = {analysisResult.coefficient}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Gauge Zone Labels */}
              <div className="flex justify-between text-[11px] text-slate-600 font-medium px-1 pt-1">
                <div className="text-left text-blue-700">
                  <span className="font-bold block">-1.0 (Opposite Direction)</span>
                  <span className="text-[10px] text-slate-400">One rises, other falls</span>
                </div>
                <div className="text-center text-slate-500">
                  <span className="font-bold block">0.0 (No Relation)</span>
                  <span className="text-[10px] text-slate-400">Completely random/unrelated</span>
                </div>
                <div className="text-right text-teal-700">
                  <span className="font-bold block">+1.0 (Same Direction)</span>
                  <span className="text-[10px] text-slate-400">Both rise & fall together</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. VIVA DEFENSE CHEAT SHEET */}
          <div
            className="rounded-2xl p-5 border shadow-xs space-y-3"
            style={{ backgroundColor: '#FAF9F6', borderColor: '#E8E5DF' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
                style={{ backgroundColor: '#156272', color: '#FFFFFF' }}
              >
                Viva Cheat Sheet
              </span>
              <h4 className="font-semibold text-xs text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                3 Talking Points to Speak in Front of Examiners
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-700 pt-1">
              <div className="p-3 rounded-xl bg-white border space-y-1 shadow-2xs" style={{ borderColor: '#E4E2DC' }}>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">1</span>
                  Objective
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  "We compared {analysisResult.sourceA.field.toUpperCase()} with {analysisResult.sourceB.field.toUpperCase()} across {analysisResult.sampleCount} clean, matched daily observations."
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border space-y-1 shadow-2xs" style={{ borderColor: '#E4E2DC' }}>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">2</span>
                  The Metric Result
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  "We obtained Pearson r = {analysisResult.coefficient}. Because this value is {analysisResult.direction.toLowerCase()} and {analysisResult.strengthBand}, it proves that as {analysisResult.sourceA.field} rises, {analysisResult.sourceB.field} reliably decreases."
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border space-y-1 shadow-2xs" style={{ borderColor: '#E4E2DC' }}>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold">3</span>
                  Examiner Caveat
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  "If the examiner asks if rain directly causes temperature drops: correlation proves association, not causation; solar shielding by cloud cover drives the mechanism."
                </p>
              </div>
            </div>
          </div>

          {/* 4. MULTI-VIEW CHART SECTION */}
          <div
            className="bg-white rounded-2xl p-6 border shadow-xs space-y-4"
            style={{ borderColor: '#E4E2DC' }}
          >
            {/* View Mode Switcher Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: '#F0EEE9' }}>
              <div>
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Interactive Visual Exploration
                </h3>
                <p className="text-xs text-slate-500">
                  Switch between 3 graph formats designed for simple viva presentations
                </p>
              </div>

              {/* View Selector Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl border bg-slate-50" style={{ borderColor: '#E4E2DC' }}>
                <button
                  type="button"
                  onClick={() => setChartViewMode('bars')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: chartViewMode === 'bars' ? '#156272' : 'transparent',
                    color: chartViewMode === 'bars' ? '#fff' : '#4B5563',
                  }}
                >
                  <BarChart3 size={14} />
                  <span>Side-by-Side Bars (Easiest)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartViewMode('scatter')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: chartViewMode === 'scatter' ? '#156272' : 'transparent',
                    color: chartViewMode === 'scatter' ? '#fff' : '#4B5563',
                  }}
                >
                  <ScatterIcon size={14} />
                  <span>Scatter + Trend Line</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChartViewMode('timeline')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: chartViewMode === 'timeline' ? '#156272' : 'transparent',
                    color: chartViewMode === 'timeline' ? '#fff' : '#4B5563',
                  }}
                >
                  <Activity size={14} />
                  <span>Dual Timeline</span>
                </button>
              </div>
            </div>

            {/* CHART VIEW 1: SIDE-BY-SIDE BARS (EASIEST FOR VIVA) */}
            {chartViewMode === 'bars' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-800">Explanation Tip:</span> Compare the green bar ({analysisResult.sourceA.field}) with the blue bar ({analysisResult.sourceB.field}) for each observation.
                  </div>

                  {/* Bar Sorting Controls */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Sort observations by:</span>
                    <button
                      type="button"
                      onClick={() => setBarSortOrder('date')}
                      className="px-2.5 py-1 rounded-lg border text-xs font-medium"
                      style={{
                        backgroundColor: barSortOrder === 'date' ? '#156272' : '#fff',
                        color: barSortOrder === 'date' ? '#fff' : '#4B5563',
                        borderColor: '#E4E2DC',
                      }}
                    >
                      Calendar Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setBarSortOrder('sorted_a')}
                      className="px-2.5 py-1 rounded-lg border text-xs font-medium"
                      style={{
                        backgroundColor: barSortOrder === 'sorted_a' ? '#156272' : '#fff',
                        color: barSortOrder === 'sorted_a' ? '#fff' : '#4B5563',
                        borderColor: '#E4E2DC',
                      }}
                    >
                      Highest to Lowest {analysisResult.sourceA.field}
                    </button>
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" />
                      <XAxis
                        dataKey="dateShort"
                        stroke="#8B8B97"
                        fontSize={10}
                        tickLine={false}
                        interval={Math.ceil(barChartData.length / 15)}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#156272"
                        fontSize={11}
                        tickLine={false}
                        unit={` ${analysisResult.sourceA.unit}`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#4F46E5"
                        fontSize={11}
                        tickLine={false}
                        unit={` ${analysisResult.sourceB.unit}`}
                      />
                      <Tooltip
                        content={({ payload, label }) => {
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
                                {analysisResult.sourceA.field}: <strong>{pt[analysisResult.sourceA.field]} {analysisResult.sourceA.unit}</strong>
                              </p>
                              <p className="text-indigo-700">
                                {analysisResult.sourceB.field}: <strong>{pt[analysisResult.sourceB.field]} {analysisResult.sourceB.unit}</strong>
                              </p>
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
                      <Bar
                        yAxisId="left"
                        dataKey={analysisResult.sourceA.field}
                        fill="#156272"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey={analysisResult.sourceB.field}
                        fill="#4F46E5"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-[11px] text-slate-500 italic text-center">
                  * Tip for examiners: When sorted from highest {analysisResult.sourceA.field} to lowest, you can immediately see the {analysisResult.sourceB.field} bars {analysisResult.coefficient < 0 ? 'climb higher' : 'drop lower'}.
                </p>
              </div>
            )}

            {/* CHART VIEW 2: SCATTER PLOT WITH REGRESSION TREND LINE */}
            {chartViewMode === 'scatter' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-800">Best-Fit Trend Line:</span>{' '}
                    {regression ? (
                      <span className="font-mono text-teal-800 font-bold">
                        y = {regression.slope}x + {regression.intercept} ({regression.slope < 0 ? 'Downward Slope = Negative Link' : 'Upward Slope = Positive Link'})
                      </span>
                    ) : (
                      'Calculated'
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Points: {analysisResult.sampleCount} matched days
                  </div>
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
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
                      {regression && (
                        <ReferenceLine
                          segment={[
                            { x: regression.minX, y: regression.minY },
                            { x: regression.maxX, y: regression.maxY },
                          ]}
                          stroke={regression.slope < 0 ? '#2563EB' : '#059669'}
                          strokeWidth={3}
                          strokeDasharray="4 4"
                          label={{
                            value: regression.slope < 0 ? 'Trend: Inversely Related' : 'Trend: Positively Related',
                            position: 'top',
                            fill: regression.slope < 0 ? '#2563EB' : '#059669',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        />
                      )}
                      <Scatter
                        name="Daily Observations"
                        data={analysisResult.scatterPoints}
                        fill="#156272"
                        opacity={0.75}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center text-[11px] font-medium text-slate-500 pt-1 border-t" style={{ borderColor: '#F0EEE9' }}>
                  <div className="p-2 rounded-lg bg-slate-50 border" style={{ borderColor: '#E4E2DC' }}>
                    Top-Left: Low {analysisResult.sourceA.field}, High {analysisResult.sourceB.field}
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border" style={{ borderColor: '#E4E2DC' }}>
                    Bottom-Right: High {analysisResult.sourceA.field}, Low {analysisResult.sourceB.field}
                  </div>
                </div>
              </div>
            )}

            {/* CHART VIEW 3: DUAL-AXIS LINE TIMELINE */}
            {chartViewMode === 'timeline' && (
              <div className="space-y-4">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysisResult.timeSeriesPoints} margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" />
                      <XAxis
                        dataKey="date"
                        stroke="#8B8B97"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(val) => (val ? val.slice(5) : '')}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#156272"
                        fontSize={11}
                        tickLine={false}
                        domain={['auto', 'auto']}
                        unit={` ${analysisResult.sourceA.unit}`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#4F46E5"
                        fontSize={11}
                        tickLine={false}
                        domain={['auto', 'auto']}
                        unit={` ${analysisResult.sourceB.unit}`}
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
                        dot={{ r: 2.5 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey={analysisResult.sourceB.field}
                        stroke="#4F46E5"
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* 5. CONCRETE DAY-BY-DAY EVIDENCE (REAL EXAMPLES TO CITE) */}
          {highlights && (
            <div
              className="bg-white rounded-2xl p-6 border shadow-xs space-y-3"
              style={{ borderColor: '#E4E2DC' }}
            >
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-teal-700" />
                <h4 className="font-bold text-sm text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Real-World Observation Proof Points (Cite These in Your Viva)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Highlight 1: Peak Variable A */}
                <div className="p-3.5 rounded-xl border bg-slate-50/70 space-y-1" style={{ borderColor: '#E4E2DC' }}>
                  <span className="text-[10px] uppercase font-bold text-teal-800">
                    Highest {analysisResult.sourceA.field.toUpperCase()} Day
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {highlights.maxA[analysisResult.sourceA.field]} {analysisResult.sourceA.unit}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Date: <strong className="font-mono">{highlights.maxA.date}</strong>
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    {analysisResult.sourceB.field}: <strong className="font-mono text-indigo-700">{highlights.maxA[analysisResult.sourceB.field]} {analysisResult.sourceB.unit}</strong>
                  </p>
                </div>

                {/* Highlight 2: Lowest Variable A */}
                <div className="p-3.5 rounded-xl border bg-slate-50/70 space-y-1" style={{ borderColor: '#E4E2DC' }}>
                  <span className="text-[10px] uppercase font-bold text-teal-800">
                    Lowest {analysisResult.sourceA.field.toUpperCase()} Day
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {highlights.minA[analysisResult.sourceA.field]} {analysisResult.sourceA.unit}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Date: <strong className="font-mono">{highlights.minA.date}</strong>
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    {analysisResult.sourceB.field}: <strong className="font-mono text-indigo-700">{highlights.minA[analysisResult.sourceB.field]} {analysisResult.sourceB.unit}</strong>
                  </p>
                </div>

                {/* Highlight 3: Peak Variable B */}
                <div className="p-3.5 rounded-xl border bg-slate-50/70 space-y-1" style={{ borderColor: '#E4E2DC' }}>
                  <span className="text-[10px] uppercase font-bold text-indigo-800">
                    Highest {analysisResult.sourceB.field.toUpperCase()} Day
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-900">
                    {highlights.maxB[analysisResult.sourceB.field]} {analysisResult.sourceB.unit}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Date: <strong className="font-mono">{highlights.maxB.date}</strong>
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    {analysisResult.sourceA.field}: <strong className="font-mono text-teal-700">{highlights.maxB[analysisResult.sourceA.field]} {analysisResult.sourceA.unit}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}
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
                  Save this correlation result and chart snapshot into a workspace.
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
                  placeholder="e.g. Temperature vs Rainfall Correlation"
                  className="w-full px-3 py-2.5 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border text-xs space-y-1 font-mono text-slate-600" style={{ borderColor: '#E4E2DC' }}>
                <p>Coefficient: <strong>r = {analysisResult?.coefficient}</strong></p>
                <p>Sample Size: <strong>{analysisResult?.sampleCount} matched observations</strong></p>
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
