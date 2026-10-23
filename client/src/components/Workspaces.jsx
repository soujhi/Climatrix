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
  Layers,
  Plus,
  Search,
  Filter,
  Users,
  Database,
  GitCompare,
  FileText,
  Bookmark,
  Calendar,
  Lock,
  Globe,
  Share2,
  Trash2,
  Edit3,
  Archive,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Eye,
  Loader2,
} from 'lucide-react';

export default function Workspaces({ onNavigate, onSelectDatasetForCorrelation }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'owned' | 'shared' | 'archived'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected workspace for detail view
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [workspaceDetail, setWorkspaceDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('datasets'); // 'datasets' | 'analyses' | 'notes' | 'outputs' | 'collaborators' | 'activity'

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAttachDatasetModalOpen, setIsAttachDatasetModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [isLinkOutputModalOpen, setIsLinkOutputModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [inspectingAnalysis, setInspectingAnalysis] = useState(null);

  // Form states for Create/Edit workspace
  const [wsForm, setWsForm] = useState({
    title: '',
    researchQuestion: '',
    description: '',
    visibility: 'private',
    tags: '',
  });

  // Form states for Note
  const [noteForm, setNoteForm] = useState({ title: '', body: '' });

  // Form states for Output
  const [outputForm, setOutputForm] = useState({
    title: '',
    type: 'report',
    summary: '',
    url: '',
    doi: '',
    authors: '',
  });

  // Form states for Member
  const [memberForm, setMemberForm] = useState({ email: '', role: 'editor' });
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  // All accessible datasets (for attach dataset modal)
  const [availableDatasets, setAvailableDatasets] = useState([]);

  // Fetch workspaces list
  const fetchWorkspaces = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/workspaces?filter=${filterTab}&search=${encodeURIComponent(searchQuery)}`);
      if (res.data.success) {
        setWorkspaces(res.data.data);
      }
    } catch (err) {
      console.error('[Fetch Workspaces Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [filterTab, searchQuery]);

  // Fetch workspace detail
  const fetchWorkspaceDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/workspaces/${id}`);
      if (res.data.success) {
        setWorkspaceDetail(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load workspace details');
      setSelectedWorkspaceId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchWorkspaceDetail(selectedWorkspaceId);
    } else {
      setWorkspaceDetail(null);
    }
  }, [selectedWorkspaceId]);

  // Load available datasets when opening attach modal
  const openAttachDatasetModal = async () => {
    try {
      const res = await api.get('/datasets');
      if (res.data.success) {
        setAvailableDatasets(res.data.data);
        setIsAttachDatasetModalOpen(true);
      }
    } catch (err) {
      alert('Failed to load dataset catalogue.');
    }
  };

  // Search registered users for member addition
  const handleSearchUsers = async (query) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await api.get(`/workspaces/users/search?q=${encodeURIComponent(query)}`);
      if (res.data.success) {
        setUserSearchResults(res.data.data);
      }
    } catch (err) {
      console.error('[Search Users Error]', err);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Create Workspace Submit
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    try {
      const tagsArray = wsForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await api.post('/workspaces', {
        ...wsForm,
        tags: tagsArray,
      });

      if (res.data.success) {
        setIsCreateModalOpen(false);
        setWsForm({ title: '', researchQuestion: '', description: '', visibility: 'private', tags: '' });
        fetchWorkspaces();
        setSelectedWorkspaceId(res.data.data._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create workspace.');
    }
  };

  // Edit Workspace Submit
  const handleEditWorkspace = async (e) => {
    e.preventDefault();
    try {
      const tagsArray = wsForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await api.patch(`/workspaces/${selectedWorkspaceId}`, {
        ...wsForm,
        tags: tagsArray,
      });

      if (res.data.success) {
        setIsEditModalOpen(false);
        fetchWorkspaceDetail(selectedWorkspaceId);
        fetchWorkspaces();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update workspace.');
    }
  };

  // Archive / Restore Workspace
  const handleToggleArchive = async () => {
    if (!workspaceDetail) return;
    const isArchived = Boolean(workspaceDetail.archivedAt);
    const action = isArchived ? 'restore' : 'archive';
    if (!window.confirm(`Are you sure you want to ${action} this workspace?`)) return;

    try {
      const res = await api.post(`/workspaces/${selectedWorkspaceId}/${action}`);
      if (res.data.success) {
        fetchWorkspaceDetail(selectedWorkspaceId);
        fetchWorkspaces();
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} workspace.`);
    }
  };

  // Delete Workspace
  const handleDeleteWorkspace = async () => {
    if (!window.confirm('Are you sure you want to delete this workspace? Associated notes and saved analyses will be removed. Source datasets and research outputs remain intact.')) {
      return;
    }
    try {
      const res = await api.delete(`/workspaces/${selectedWorkspaceId}`);
      if (res.data.success) {
        setSelectedWorkspaceId(null);
        fetchWorkspaces();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete workspace.');
    }
  };

  // Attach Dataset
  const handleAttachDataset = async (datasetId) => {
    try {
      const res = await api.post(`/workspaces/${selectedWorkspaceId}/datasets`, { datasetId });
      if (res.data.success) {
        setIsAttachDatasetModalOpen(false);
        fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to attach dataset.');
    }
  };

  // Detach Dataset
  const handleDetachDataset = async (datasetId) => {
    if (!window.confirm('Detach this dataset from the workspace? The original dataset will not be deleted.')) return;
    try {
      const res = await api.delete(`/workspaces/${selectedWorkspaceId}/datasets/${datasetId}`);
      if (res.data.success) {
        fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to detach dataset.');
    }
  };

  // Delete Saved Analysis
  const handleDeleteAnalysis = async (analysisId) => {
    if (!window.confirm('Delete this saved analysis snapshot?')) return;
    try {
      const res = await api.delete(`/workspaces/${selectedWorkspaceId}/analyses/${analysisId}`);
      if (res.data.success) {
        fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete analysis snapshot.');
    }
  };

  // Create or Edit Note
  const handleSaveNote = async (e) => {
    e.preventDefault();
    try {
      if (editingNote) {
        const res = await api.patch(`/workspaces/${selectedWorkspaceId}/notes/${editingNote._id}`, noteForm);
        if (res.data.success) {
          setIsAddNoteModalOpen(false);
          setEditingNote(null);
          setNoteForm({ title: '', body: '' });
          fetchWorkspaceDetail(selectedWorkspaceId);
        }
      } else {
        const res = await api.post(`/workspaces/${selectedWorkspaceId}/notes`, noteForm);
        if (res.data.success) {
          setIsAddNoteModalOpen(false);
          setNoteForm({ title: '', body: '' });
          fetchWorkspaceDetail(selectedWorkspaceId);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save note.');
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this research note?')) return;
    try {
      const res = await api.delete(`/workspaces/${selectedWorkspaceId}/notes/${noteId}`);
      if (res.data.success) {
        fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete note.');
    }
  };

  // Link Research Output
  const handleLinkOutput = async (e) => {
    e.preventDefault();
    try {
      const authorsArr = outputForm.authors
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);

      const res = await api.post(`/workspaces/${selectedWorkspaceId}/outputs`, {
        ...outputForm,
        authors: authorsArr,
      });

      if (res.data.success) {
        setIsLinkOutputModalOpen(false);
        setOutputForm({ title: '', type: 'report', summary: '', url: '', doi: '', authors: '' });
        fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to link research output.');
    }
  };

  // Unlink Research Output
  const handleUnlinkOutput = async (outputId) => {
    if (!window.confirm('Unlink this research output from the workspace?')) return;
    try {
      const res = await api.delete(`/workspaces/${selectedWorkspaceId}/outputs/${outputId}`);
      if (res.data.success) {
        fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unlink research output.');
    }
  };

  // Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/workspaces/${selectedWorkspaceId}/members`, memberForm);
      if (res.data.success) {
        setIsAddMemberModalOpen(false);
        setMemberForm({ email: '', role: 'editor' });
        setUserSearchResults([]);
        fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member.');
    }
  };

  // Update Member Role
  const handleUpdateMemberRole = async (targetUserId, newRole) => {
    try {
      const res = await api.patch(`/workspaces/${selectedWorkspaceId}/members/${targetUserId}`, { role: newRole });
      if (res.data.success) {
        fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update member role.');
    }
  };

  // Remove Member
  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Remove this collaborator from the workspace?')) return;
    try {
      const res = await api.delete(`/workspaces/${selectedWorkspaceId}/members/${targetUserId}`);
      if (res.data.success) {
        fetchWorkspaceDetail(selectedWorkspaceId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  /* =========================================================================================
   * VIEW 1: WORKSPACES LIST VIEW
   * ========================================================================================= */
  if (!selectedWorkspaceId) {
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
                Feature 5 • Collaborative Workspaces
              </span>
            </div>
            <h1
              className="text-2xl font-semibold mb-1"
              style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}
            >
              Research Workspaces
            </h1>
            <p className="text-sm" style={{ color: '#8B8B97' }}>
              Organize investigations around central climate research questions, curate benchmark datasets, save correlation snapshots, and collaborate.
            </p>
          </div>

          <button
            onClick={() => {
              setWsForm({ title: '', researchQuestion: '', description: '', visibility: 'private', tags: '' });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all duration-150"
            style={{ backgroundColor: '#156272', fontFamily: "'DM Sans', sans-serif" }}
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>New Workspace</span>
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border" style={{ borderColor: '#E4E2DC' }}>
            {[
              { id: 'all', label: 'All Workspaces' },
              { id: 'owned', label: 'Owned by Me' },
              { id: 'shared', label: 'Shared with Me' },
              { id: 'archived', label: 'Archived' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: filterTab === tab.id ? '#156272' : 'transparent',
                  color: filterTab === tab.id ? '#fff' : '#64748B',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, question, or tag…"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white border outline-none shadow-xs"
              style={{ borderColor: '#E4E2DC' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Workspaces Grid */}
        {loading ? (
          <div className="p-16 text-center text-xs font-mono text-slate-400">
            Loading research workspaces...
          </div>
        ) : workspaces.length === 0 ? (
          <div
            className="bg-white rounded-2xl p-16 text-center border shadow-xs max-w-xl mx-auto space-y-4"
            style={{ borderColor: '#E4E2DC' }}
          >
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-slate-100 text-teal-800">
              <Layers size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                No Workspaces Found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {filterTab === 'archived'
                  ? 'There are no archived workspaces.'
                  : 'Start a new research project by defining a central climate question, attaching datasets, and running empirical analyses.'}
              </p>
            </div>
            {filterTab !== 'archived' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
                style={{ backgroundColor: '#156272' }}
              >
                Create Your First Workspace
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((ws) => (
              <div
                key={ws._id}
                onClick={() => setSelectedWorkspaceId(ws._id)}
                className="bg-white rounded-2xl p-6 border shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                style={{ borderColor: '#E4E2DC' }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                      style={{
                        backgroundColor: ws.userRole === 'owner' ? '#ECFDF5' : '#F0FDFA',
                        color: ws.userRole === 'owner' ? '#065F46' : '#0F766E',
                        borderColor: ws.userRole === 'owner' ? '#A7F3D0' : '#99F6E4',
                      }}
                    >
                      {ws.userRole || 'Member'}
                    </span>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      {ws.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                      <span className="capitalize">{ws.visibility}</span>
                      {ws.isArchived && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3
                      className="text-base font-bold text-slate-900 group-hover:text-teal-800 transition-colors line-clamp-1"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {ws.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium italic mt-1 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{ws.researchQuestion}"
                    </p>
                  </div>

                  {ws.tags && ws.tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ws.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: '#F0EEE9', color: '#4A4A52' }}
                        >
                          #{tag}
                        </span>
                      ))}
                      {ws.tags.length > 3 && (
                        <span className="text-[10px] text-slate-400">+{ws.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Counts & Timestamps */}
                <div className="pt-3 border-t flex items-center justify-between text-xs text-slate-500" style={{ borderColor: '#F0EEE9' }}>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span title="Datasets" className="flex items-center gap-1">
                      <Database size={12} className="text-teal-700" /> {ws.datasetsCount}
                    </span>
                    <span title="Saved Analyses" className="flex items-center gap-1">
                      <GitCompare size={12} className="text-indigo-600" /> {ws.analysesCount}
                    </span>
                    <span title="Notes" className="flex items-center gap-1">
                      <FileText size={12} className="text-slate-500" /> {ws.notesCount}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    Updated {new Date(ws.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal: Create Workspace */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-5"
              style={{ borderColor: '#E4E2DC' }}
            >
              <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: '#F0EEE9' }}>
                <div>
                  <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Create Research Workspace
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structure your investigation around a central climate research question.
                  </p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Workspace Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={100}
                    value={wsForm.title}
                    onChange={(e) => setWsForm({ ...wsForm, title: e.target.value })}
                    placeholder="e.g. Western Ghats Monsoon Orographic Precipitation Analysis"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">3–100 characters</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Central Research Question <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    minLength={10}
                    maxLength={500}
                    value={wsForm.researchQuestion}
                    onChange={(e) => setWsForm({ ...wsForm, researchQuestion: e.target.value })}
                    placeholder="e.g. How does elevation and coastal proximity modulate seasonal precipitation intensity along Western Ghats maritime stations?"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">10–500 characters</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Methodology / Description</label>
                  <textarea
                    rows={2}
                    value={wsForm.description}
                    onChange={(e) => setWsForm({ ...wsForm, description: e.target.value })}
                    placeholder="Brief background and scope of study..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Visibility</label>
                    <select
                      value={wsForm.visibility}
                      onChange={(e) => setWsForm({ ...wsForm, visibility: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      <option value="private">Private (Invited Members Only)</option>
                      <option value="shared">Shared (Accessible across Team)</option>
                      <option value="public">Public (Open Inspection)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={wsForm.tags}
                      onChange={(e) => setWsForm({ ...wsForm, tags: e.target.value })}
                      placeholder="monsoon, rainfall, coastal"
                      className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                      style={{ borderColor: '#E4E2DC' }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: '#F0EEE9' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium border text-slate-600 hover:bg-slate-50"
                    style={{ borderColor: '#E4E2DC' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: '#156272' }}
                  >
                    Create Workspace
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* =========================================================================================
   * VIEW 2: WORKSPACE DETAIL VIEW
   * ========================================================================================= */
  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F5F4F1' }}>
      {/* Top back navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setSelectedWorkspaceId(null)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-800 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Workspaces</span>
        </button>

        {workspaceDetail && (
          <div className="flex items-center gap-2">
            {workspaceDetail.access.canEdit && (
              <button
                onClick={() => {
                  setWsForm({
                    title: workspaceDetail.title,
                    researchQuestion: workspaceDetail.researchQuestion,
                    description: workspaceDetail.description,
                    visibility: workspaceDetail.visibility,
                    tags: (workspaceDetail.tags || []).join(', '),
                  });
                  setIsEditModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-white text-slate-700 hover:bg-slate-50"
                style={{ borderColor: '#E4E2DC' }}
              >
                <Edit3 size={13} />
                <span>Edit Workspace</span>
              </button>
            )}

            {workspaceDetail.access.isOwner && (
              <>
                <button
                  onClick={handleToggleArchive}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-white text-slate-700 hover:bg-slate-50"
                  style={{ borderColor: '#E4E2DC' }}
                >
                  <Archive size={13} />
                  <span>{workspaceDetail.archivedAt ? 'Restore' : 'Archive'}</span>
                </button>

                <button
                  onClick={handleDeleteWorkspace}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-white text-rose-600 hover:bg-rose-50"
                  style={{ borderColor: '#E4E2DC' }}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {detailLoading || !workspaceDetail ? (
        <div className="p-16 text-center text-xs font-mono text-slate-400">
          Loading workspace details...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workspace Hero Header */}
          <div
            className="bg-white rounded-2xl p-6 border shadow-xs space-y-4"
            style={{ borderColor: '#E4E2DC' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  style={{ backgroundColor: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0' }}
                >
                  Your Role: {workspaceDetail.access.role || 'Member'}
                </span>

                <span className="flex items-center gap-1 text-xs text-slate-500 capitalize font-mono">
                  {workspaceDetail.visibility === 'private' ? <Lock size={12} /> : <Globe size={12} />}
                  {workspaceDetail.visibility}
                </span>

                {workspaceDetail.archivedAt && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                    Archived • Read Only
                  </span>
                )}
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                Created {new Date(workspaceDetail.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {workspaceDetail.title}
              </h1>

              {/* Research Question Callout */}
              <div className="bg-slate-50 border rounded-xl p-4 text-xs space-y-1" style={{ borderColor: '#E4E2DC' }}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                  Central Research Question
                </span>
                <p className="text-slate-800 font-medium italic text-sm">
                  "{workspaceDetail.researchQuestion}"
                </p>
              </div>

              {workspaceDetail.description && (
                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {workspaceDetail.description}
                </p>
              )}
            </div>

            {workspaceDetail.tags && workspaceDetail.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                {workspaceDetail.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium"
                    style={{ backgroundColor: '#F0EEE9', color: '#4A4A52' }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section Tabs */}
          <div className="flex items-center gap-2 border-b" style={{ borderColor: '#E4E2DC' }}>
            {[
              { id: 'datasets', label: 'Attached Datasets', count: workspaceDetail.datasets.length, icon: Database },
              { id: 'analyses', label: 'Saved Analyses', count: workspaceDetail.analyses.length, icon: GitCompare },
              { id: 'notes', label: 'Research Notes', count: workspaceDetail.notes.length, icon: FileText },
              { id: 'outputs', label: 'Research Outputs', count: workspaceDetail.outputs.length, icon: BookOpen },
              { id: 'collaborators', label: 'Collaborators', count: workspaceDetail.members.length, icon: Users },
              { id: 'activity', label: 'Activity Timeline', count: workspaceDetail.activities.length, icon: Clock },
            ].map((tab) => {
              const active = activeDetailTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-all -mb-px"
                  style={{
                    borderColor: active ? '#156272' : 'transparent',
                    color: active ? '#156272' : '#64748B',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  <span
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-mono"
                    style={{
                      backgroundColor: active ? '#EAF4F6' : '#F1F5F9',
                      color: active ? '#156272' : '#64748B',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: DATASETS */}
          {activeDetailTab === 'datasets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Linked Datasets
                  </h3>
                  <p className="text-xs text-slate-500">
                    Datasets referenced in this workspace. Source files and records are never duplicated.
                  </p>
                </div>
                {workspaceDetail.access.canEdit && (
                  <button
                    onClick={openAttachDatasetModal}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: '#156272' }}
                  >
                    <Plus size={14} />
                    <span>Attach Dataset</span>
                  </button>
                )}
              </div>

              {workspaceDetail.datasets.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border shadow-xs space-y-3" style={{ borderColor: '#E4E2DC' }}>
                  <p className="text-xs text-slate-500">No datasets currently attached to this workspace.</p>
                  {workspaceDetail.access.canEdit && (
                    <button
                      onClick={openAttachDatasetModal}
                      className="text-xs font-semibold underline text-teal-800"
                    >
                      Attach an existing dataset
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workspaceDetail.datasets.map((ds) => (
                    <div
                      key={ds._id}
                      className="bg-white rounded-2xl p-5 border shadow-xs flex flex-col justify-between space-y-3"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {ds.name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400">{ds.originalFileName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono text-slate-500 mt-1">
                          <span>{ds.rowCount} rows</span>
                          <span>•</span>
                          <span>{ds.columnCount} columns</span>
                          <span>•</span>
                          <span>{ds.hasCoordinates ? '📍 Georeferenced' : 'Non-spatial'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                          Parameters
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {(ds.parameters || []).map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 capitalize">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: '#F0EEE9' }}>
                        <button
                          onClick={() => {
                            if (onSelectDatasetForCorrelation) {
                              onSelectDatasetForCorrelation(ds._id);
                            } else if (onNavigate) {
                              onNavigate('correlation');
                            }
                          }}
                          className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:underline"
                        >
                          <GitCompare size={13} />
                          <span>Explore in Correlation Explorer</span>
                        </button>

                        {workspaceDetail.access.canEdit && (
                          <button
                            onClick={() => handleDetachDataset(ds._id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                            title="Detach from workspace"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ANALYSES */}
          {activeDetailTab === 'analyses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Saved Correlation Snapshots
                  </h3>
                  <p className="text-xs text-slate-500">
                    Empirical calculations, scatter datasets, and time-series snapshots saved into this workspace.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate && onNavigate('correlation')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
                  style={{ backgroundColor: '#156272' }}
                >
                  <Plus size={14} />
                  <span>Run New Correlation</span>
                </button>
              </div>

              {workspaceDetail.analyses.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border shadow-xs space-y-3" style={{ borderColor: '#E4E2DC' }}>
                  <p className="text-xs text-slate-500">No correlation analyses saved to this workspace yet.</p>
                  <button
                    onClick={() => onNavigate && onNavigate('correlation')}
                    className="text-xs font-semibold underline text-teal-800"
                  >
                    Open Correlation Explorer to compute an analysis
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workspaceDetail.analyses.map((a) => (
                    <div
                      key={a._id}
                      className="bg-white rounded-2xl p-5 border shadow-xs space-y-3 flex flex-col justify-between"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: a.coefficient > 0 ? '#ECFDF5' : '#EFF6FF',
                              color: a.coefficient > 0 ? '#059669' : '#2563EB',
                            }}
                          >
                            r = {a.coefficient > 0 ? `+${a.coefficient}` : a.coefficient} ({a.strengthBand})
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {new Date(a.snapshotAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {a.title}
                        </h4>

                        <p className="text-xs text-slate-500 font-mono">
                          {a.sourceA.field} ({a.sourceA.location}) vs {a.sourceB.field} ({a.sourceB.location})
                        </p>

                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                          <span>N = {a.sampleCount} pairs</span>
                          <span>•</span>
                          <span>{a.dateRange.start} to {a.dateRange.end}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: '#F0EEE9' }}>
                        <button
                          onClick={() => setInspectingAnalysis(a)}
                          className="flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline"
                        >
                          <Eye size={13} />
                          <span>Inspect Snapshot & Charts</span>
                        </button>

                        {workspaceDetail.access.canEdit && (
                          <button
                            onClick={() => handleDeleteAnalysis(a._id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete snapshot"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTES */}
          {activeDetailTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Research Notes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dated empirical notes, observations, and hypotheses recorded by collaborators.
                  </p>
                </div>
                {workspaceDetail.access.canEdit && (
                  <button
                    onClick={() => {
                      setEditingNote(null);
                      setNoteForm({ title: '', body: '' });
                      setIsAddNoteModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: '#156272' }}
                  >
                    <Plus size={14} />
                    <span>Add Note</span>
                  </button>
                )}
              </div>

              {workspaceDetail.notes.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border shadow-xs space-y-3" style={{ borderColor: '#E4E2DC' }}>
                  <p className="text-xs text-slate-500">No research notes added yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workspaceDetail.notes.map((n) => (
                    <div
                      key={n._id}
                      className="bg-white rounded-2xl p-5 border shadow-xs space-y-2"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {n.title}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400">• By {n.authorName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-400">
                            {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>

                          {workspaceDetail.access.canEdit && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingNote(n);
                                  setNoteForm({ title: n.title, body: n.body });
                                  setIsAddNoteModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(n._id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {n.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: RESEARCH OUTPUTS */}
          {activeDetailTab === 'outputs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Linked Research Outputs
                  </h3>
                  <p className="text-xs text-slate-500">
                    Peer-reviewed papers, agency reports, and published empirical findings connected to this workspace.
                  </p>
                </div>
                {workspaceDetail.access.canEdit && (
                  <button
                    onClick={() => setIsLinkOutputModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: '#156272' }}
                  >
                    <Plus size={14} />
                    <span>Link Output</span>
                  </button>
                )}
              </div>

              {workspaceDetail.outputs.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border shadow-xs space-y-3" style={{ borderColor: '#E4E2DC' }}>
                  <p className="text-xs text-slate-500">No external research outputs or reports linked yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workspaceDetail.outputs.map((out) => (
                    <div
                      key={out._id}
                      className="bg-white rounded-2xl p-5 border shadow-xs space-y-3 flex flex-col justify-between"
                      style={{ borderColor: '#E4E2DC' }}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {out.type}
                          </span>
                          {out.publishedAt && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {new Date(out.publishedAt).getFullYear()}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          {out.title}
                        </h4>

                        {out.authors && (
                          <p className="text-xs text-slate-500 italic">
                            By {out.authors.join(', ')}
                          </p>
                        )}

                        {out.summary && (
                          <p className="text-xs text-slate-600 line-clamp-3">
                            {out.summary}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: '#F0EEE9' }}>
                        <div className="flex items-center gap-3">
                          {out.url && (
                            <a
                              href={out.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 font-semibold text-teal-800 hover:underline"
                            >
                              <span>Read Publication</span>
                              <ExternalLink size={12} />
                            </a>
                          )}
                          {out.doi && (
                            <span className="font-mono text-[11px] text-slate-400">
                              DOI: {out.doi}
                            </span>
                          )}
                        </div>

                        {workspaceDetail.access.canEdit && (
                          <button
                            onClick={() => handleUnlinkOutput(out._id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: COLLABORATORS */}
          {activeDetailTab === 'collaborators' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Workspace Collaborators & Roles
                  </h3>
                  <p className="text-xs text-slate-500">
                    Owner controls membership and assignments. Editors can curate content; Viewers have read-only inspection.
                  </p>
                </div>
                {workspaceDetail.access.canManageMembers && (
                  <button
                    onClick={() => {
                      setMemberForm({ email: '', role: 'editor' });
                      setIsAddMemberModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: '#156272' }}
                  >
                    <Plus size={14} />
                    <span>Add Collaborator</span>
                  </button>
                )}
              </div>

              <div className="bg-white rounded-2xl border shadow-xs overflow-hidden" style={{ borderColor: '#E4E2DC' }}>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b text-slate-500 font-semibold" style={{ borderColor: '#F0EEE9' }}>
                    <tr>
                      <th className="px-5 py-3.5">Collaborator</th>
                      <th className="px-5 py-3.5">Email Address</th>
                      <th className="px-5 py-3.5">Role</th>
                      <th className="px-5 py-3.5">Added Date</th>
                      {workspaceDetail.access.canManageMembers && <th className="px-5 py-3.5 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workspaceDetail.members.map((m) => {
                      const isOwnerUser = m.role === 'owner';
                      const initials = m.name?.charAt(0) || 'U';
                      return (
                        <tr key={m.userId} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3.5 font-medium text-slate-900 flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-[11px]">
                              {initials}
                            </div>
                            <span>{m.name}</span>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-500">{m.email}</td>
                          <td className="px-5 py-3.5">
                            {isOwnerUser || !workspaceDetail.access.canManageMembers ? (
                              <span
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider"
                                style={{
                                  backgroundColor: isOwnerUser ? '#ECFDF5' : '#F0FDFA',
                                  color: isOwnerUser ? '#065F46' : '#0F766E',
                                }}
                              >
                                {m.role}
                              </span>
                            ) : (
                              <select
                                value={m.role}
                                onChange={(e) => handleUpdateMemberRole(m.userId, e.target.value)}
                                className="px-2 py-1 rounded-lg border bg-white text-xs font-semibold outline-none"
                                style={{ borderColor: '#E4E2DC' }}
                              >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-400">
                            {m.addedAt ? new Date(m.addedAt).toLocaleDateString() : 'N/A'}
                          </td>
                          {workspaceDetail.access.canManageMembers && (
                            <td className="px-5 py-3.5 text-right">
                              {!isOwnerUser && (
                                <button
                                  onClick={() => handleRemoveMember(m.userId)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                  title="Remove collaborator"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ACTIVITY TIMELINE */}
          {activeDetailTab === 'activity' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Workspace Activity Audit Trail
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological record of dataset attachments, analyses, and member updates.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 border shadow-xs" style={{ borderColor: '#E4E2DC' }}>
                {workspaceDetail.activities.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No activity records logged.</p>
                ) : (
                  <div className="space-y-4">
                    {workspaceDetail.activities.map((act) => (
                      <div key={act._id} className="flex items-start gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-teal-700 mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-slate-800 font-medium">{act.summary}</p>
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                            By {act.actorName} • {new Date(act.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Edit Workspace */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-5" style={{ borderColor: '#E4E2DC' }}>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: '#F0EEE9' }}>
              <h3 className="text-base font-bold text-slate-900">Edit Workspace Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={100}
                  value={wsForm.title}
                  onChange={(e) => setWsForm({ ...wsForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Central Research Question</label>
                <textarea
                  required
                  rows={3}
                  minLength={10}
                  maxLength={500}
                  value={wsForm.researchQuestion}
                  onChange={(e) => setWsForm({ ...wsForm, researchQuestion: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={wsForm.description}
                  onChange={(e) => setWsForm({ ...wsForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Visibility</label>
                  <select
                    value={wsForm.visibility}
                    onChange={(e) => setWsForm({ ...wsForm, visibility: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  >
                    <option value="private">Private</option>
                    <option value="shared">Shared</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tags</label>
                  <input
                    type="text"
                    value={wsForm.tags}
                    onChange={(e) => setWsForm({ ...wsForm, tags: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: '#F0EEE9' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border"
                  style={{ borderColor: '#E4E2DC' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ backgroundColor: '#156272' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Attach Dataset */}
      {isAttachDatasetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4" style={{ borderColor: '#E4E2DC' }}>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: '#F0EEE9' }}>
              <div>
                <h3 className="text-base font-bold text-slate-900">Attach Dataset to Workspace</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select from your accessible climate datasets.</p>
              </div>
              <button onClick={() => setIsAttachDatasetModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {availableDatasets.map((ds) => {
                const isAlreadyAttached = (workspaceDetail.datasetIds || []).some(
                  (id) => id.toString() === ds._id.toString()
                );
                return (
                  <div
                    key={ds._id}
                    className="p-3.5 rounded-xl border flex items-center justify-between gap-3 hover:bg-slate-50"
                    style={{ borderColor: '#E4E2DC' }}
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{ds.name}</h4>
                      <p className="text-[11px] font-mono text-slate-500">{ds.rowCount} rows • {ds.parameters?.join(', ')}</p>
                    </div>

                    {isAlreadyAttached ? (
                      <span className="text-[11px] font-semibold text-slate-400">Attached</span>
                    ) : (
                      <button
                        onClick={() => handleAttachDataset(ds._id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs"
                        style={{ backgroundColor: '#156272' }}
                      >
                        Attach
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Note */}
      {isAddNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4" style={{ borderColor: '#E4E2DC' }}>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: '#F0EEE9' }}>
              <h3 className="text-base font-bold text-slate-900">
                {editingNote ? 'Edit Research Note' : 'Add Research Note'}
              </h3>
              <button onClick={() => setIsAddNoteModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note Title</label>
                <input
                  type="text"
                  required
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  placeholder="e.g. Diurnal Temperature Inversion Observations"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
                <textarea
                  required
                  rows={5}
                  value={noteForm.body}
                  onChange={(e) => setNoteForm({ ...noteForm, body: e.target.value })}
                  placeholder="Record observations, hypotheses, data discrepancies..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: '#F0EEE9' }}>
                <button
                  type="button"
                  onClick={() => setIsAddNoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border"
                  style={{ borderColor: '#E4E2DC' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ backgroundColor: '#156272' }}
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Link Research Output */}
      {isLinkOutputModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border space-y-4" style={{ borderColor: '#E4E2DC' }}>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: '#F0EEE9' }}>
              <h3 className="text-base font-bold text-slate-900">Link Research Output</h3>
              <button onClick={() => setIsLinkOutputModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLinkOutput} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={outputForm.title}
                  onChange={(e) => setOutputForm({ ...outputForm, title: e.target.value })}
                  placeholder="e.g. IMD Monsoon Technical Report Series 2026"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={outputForm.type}
                    onChange={(e) => setOutputForm({ ...outputForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  >
                    <option value="report">Report</option>
                    <option value="paper">Peer-Reviewed Paper</option>
                    <option value="finding">Key Finding</option>
                    <option value="memo">Technical Memo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Authors (comma-separated)</label>
                  <input
                    type="text"
                    value={outputForm.authors}
                    onChange={(e) => setOutputForm({ ...outputForm, authors: e.target.value })}
                    placeholder="e.g. A. Rivera, S. Verma"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">External URL</label>
                  <input
                    type="url"
                    value={outputForm.url}
                    onChange={(e) => setOutputForm({ ...outputForm, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">DOI</label>
                  <input
                    type="text"
                    value={outputForm.doi}
                    onChange={(e) => setOutputForm({ ...outputForm, doi: e.target.value })}
                    placeholder="10.1016/..."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                    style={{ borderColor: '#E4E2DC' }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Summary Abstract</label>
                <textarea
                  rows={2}
                  value={outputForm.summary}
                  onChange={(e) => setOutputForm({ ...outputForm, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: '#F0EEE9' }}>
                <button
                  type="button"
                  onClick={() => setIsLinkOutputModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border"
                  style={{ borderColor: '#E4E2DC' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ backgroundColor: '#156272' }}
                >
                  Link Output
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Collaborator */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border space-y-4" style={{ borderColor: '#E4E2DC' }}>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: '#F0EEE9' }}>
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Collaborator</h3>
                <p className="text-xs text-slate-500 mt-0.5">Invite a registered researcher to this workspace.</p>
              </div>
              <button onClick={() => setIsAddMemberModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered User Email</label>
                <input
                  type="email"
                  required
                  value={memberForm.email}
                  onChange={(e) => {
                    setMemberForm({ ...memberForm, email: e.target.value });
                    handleSearchUsers(e.target.value);
                  }}
                  placeholder="e.g. student@climatrix.edu"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                />
                {userSearchResults.length > 0 && (
                  <div className="mt-2 border rounded-xl p-2 bg-slate-50 max-h-36 overflow-y-auto space-y-1">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Matching Registered Users:</p>
                    {userSearchResults.map((u) => (
                      <button
                        type="button"
                        key={u._id}
                        onClick={() => {
                          setMemberForm({ ...memberForm, email: u.email });
                          setUserSearchResults([]);
                        }}
                        className="w-full text-left px-2 py-1 rounded text-xs hover:bg-slate-200/60 flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-900">{u.name}</span>
                        <span className="font-mono text-slate-500">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role Permission</label>
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border outline-none"
                  style={{ borderColor: '#E4E2DC' }}
                >
                  <option value="editor">Editor (Can attach datasets, save analyses & notes)</option>
                  <option value="viewer">Viewer (Read-only observation)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: '#F0EEE9' }}>
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border"
                  style={{ borderColor: '#E4E2DC' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ backgroundColor: '#156272' }}
                >
                  Add Collaborator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Inspect Saved Analysis Snapshot */}
      {inspectingAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border"
            style={{ borderColor: '#E4E2DC' }}
          >
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#F0EEE9' }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: inspectingAnalysis.coefficient > 0 ? '#ECFDF5' : '#EFF6FF',
                      color: inspectingAnalysis.coefficient > 0 ? '#059669' : '#2563EB',
                    }}
                  >
                    r = {inspectingAnalysis.coefficient > 0 ? `+${inspectingAnalysis.coefficient}` : inspectingAnalysis.coefficient} ({inspectingAnalysis.strengthBand})
                  </span>
                  <span className="text-slate-400 text-xs">• Snapshot Taken: {new Date(inspectingAnalysis.snapshotAt).toLocaleString()}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {inspectingAnalysis.title}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {inspectingAnalysis.sourceA.field} ({inspectingAnalysis.sourceA.unit}) vs {inspectingAnalysis.sourceB.field} ({inspectingAnalysis.sourceB.unit}) • N = {inspectingAnalysis.sampleCount} observations
                </p>
              </div>
              <button
                onClick={() => setInspectingAnalysis(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Dual Charts in Snapshot */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scatter */}
                <div className="border rounded-xl p-4 bg-slate-50/50" style={{ borderColor: '#E4E2DC' }}>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Bivariate Scatter Snapshot</h4>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name={inspectingAnalysis.sourceA.field}
                          unit={` ${inspectingAnalysis.sourceA.unit}`}
                          fontSize={10}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name={inspectingAnalysis.sourceB.field}
                          unit={` ${inspectingAnalysis.sourceB.unit}`}
                          fontSize={10}
                        />
                        <Tooltip />
                        <Scatter data={inspectingAnalysis.scatterPoints} fill="#156272" opacity={0.8} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Time Series */}
                <div className="border rounded-xl p-4 bg-slate-50/50" style={{ borderColor: '#E4E2DC' }}>
                  <h4 className="text-xs font-bold text-slate-700 mb-2">Dual-Axis Time Series Snapshot</h4>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={inspectingAnalysis.timeSeriesPoints} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F0EEE9" />
                        <XAxis dataKey="date" fontSize={10} tickFormatter={(val) => val?.slice(5) || ''} />
                        <YAxis yAxisId="left" fontSize={10} stroke="#156272" domain={['auto', 'auto']} />
                        <YAxis yAxisId="right" orientation="right" fontSize={10} stroke="#4F46E5" domain={['auto', 'auto']} />
                        <Tooltip />
                        <Line yAxisId="left" type="monotone" dataKey={inspectingAnalysis.sourceA.field} stroke="#156272" dot={{ r: 2 }} />
                        <Line yAxisId="right" type="monotone" dataKey={inspectingAnalysis.sourceB.field} stroke="#4F46E5" dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Caveat */}
              <div className="p-3.5 rounded-xl border bg-slate-50 text-xs text-slate-600" style={{ borderColor: '#E4E2DC' }}>
                <span className="font-semibold text-slate-800">Caveat: </span>
                {inspectingAnalysis.caveats}
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end" style={{ borderColor: '#F0EEE9' }}>
              <button
                onClick={() => setInspectingAnalysis(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white"
                style={{ backgroundColor: '#156272' }}
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
