import ResearchWorkspace from '../models/ResearchWorkspace.js';
import WorkspaceNote from '../models/WorkspaceNote.js';
import SavedAnalysis from '../models/SavedAnalysis.js';
import WorkspaceActivity from '../models/WorkspaceActivity.js';
import ResearchOutput from '../models/ResearchOutput.js';
import Dataset from '../models/Dataset.js';
import User from '../models/User.js';

/**
 * HELPER: Evaluates user roles and access rights in a workspace
 */
export const evaluateWorkspaceAccess = (workspace, userId) => {
  if (!workspace || !userId) {
    return {
      isOwner: false,
      isEditor: false,
      isViewer: false,
      isMember: false,
      role: null,
      canEdit: false,
      canManageMembers: false,
      isArchived: Boolean(workspace?.archivedAt),
    };
  }

  const uId = userId.toString();
  const isOwner = workspace.ownerId?.toString() === uId;
  const member = (workspace.members || []).find((m) => m.userId?.toString() === uId);

  let role = isOwner ? 'owner' : member?.role || null;
  const isEditor = role === 'editor';
  const isViewer = role === 'viewer';
  const isMember = Boolean(isOwner || member);
  const isArchived = Boolean(workspace.archivedAt);

  return {
    isOwner,
    isEditor,
    isViewer,
    isMember,
    role,
    canEdit: (isOwner || isEditor) && !isArchived,
    canManageMembers: isOwner && !isArchived,
    isArchived,
  };
};

/**
 * HELPER: Records activity log event
 */
const logActivity = async ({ workspaceId, actorId, actorName, action, targetType, targetId, summary }) => {
  try {
    await WorkspaceActivity.create({
      workspaceId,
      actorId,
      actorName,
      action,
      targetType,
      targetId: targetId ? targetId.toString() : '',
      summary,
    });
  } catch (err) {
    console.error('[Log Activity Error]', err.message);
  }
};

// @desc    List accessible workspaces (with filters, search, and counts)
// @route   GET /api/workspaces
// @access  Private
export const getWorkspaces = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { filter = 'all', search = '', sort = 'recent' } = req.query;

    let query = {
      $or: [{ ownerId: userId }, { 'members.userId': userId }, { visibility: 'public' }],
    };

    if (filter === 'archived') {
      query.archivedAt = { $ne: null };
    } else {
      query.archivedAt = null;
    }

    let workspaces = await ResearchWorkspace.find(query);

    // Apply ownership / sharing filter
    if (filter === 'owned') {
      workspaces = workspaces.filter((ws) => ws.ownerId?.toString() === userId);
    } else if (filter === 'shared') {
      workspaces = workspaces.filter(
        (ws) => ws.ownerId?.toString() !== userId && ws.members?.some((m) => m.userId?.toString() === userId)
      );
    }

    // Apply search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      workspaces = workspaces.filter(
        (ws) =>
          ws.title.toLowerCase().includes(q) ||
          ws.researchQuestion.toLowerCase().includes(q) ||
          (ws.description && ws.description.toLowerCase().includes(q)) ||
          (ws.tags && ws.tags.some((t) => t.toLowerCase().includes(q)))
      );
    }

    // Attach real counts for each workspace
    const enriched = await Promise.all(
      workspaces.map(async (ws) => {
        const wsId = ws._id.toString();
        const access = evaluateWorkspaceAccess(ws, userId);

        const [analyses, notes] = await Promise.all([
          SavedAnalysis.find({ workspaceId: wsId }),
          WorkspaceNote.find({ workspaceId: wsId }),
        ]);

        return {
          _id: ws._id,
          title: ws.title,
          researchQuestion: ws.researchQuestion,
          description: ws.description,
          ownerId: ws.ownerId,
          visibility: ws.visibility,
          tags: ws.tags || [],
          archivedAt: ws.archivedAt,
          membersCount: (ws.members || []).length,
          members: ws.members || [],
          datasetsCount: (ws.datasetIds || []).length,
          analysesCount: (analyses || []).length,
          notesCount: (notes || []).length,
          outputsCount: (ws.researchOutputIds || []).length,
          userRole: access.role,
          canEdit: access.canEdit,
          isArchived: access.isArchived,
          createdAt: ws.createdAt,
          updatedAt: ws.updatedAt,
        };
      })
    );

    return res.status(200).json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('[Get Workspaces Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed workspace with attached datasets, analyses, notes, and activity
// @route   GET /api/workspaces/:id
// @access  Private
export const getWorkspaceById = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Research workspace not found.' });
    }

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.isMember && workspace.visibility !== 'public' && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not a member of this private research workspace.',
      });
    }

    const wsId = workspace._id.toString();

    // Load related resources concurrently
    const [attachedDatasets, savedAnalyses, notes, outputs, activities] = await Promise.all([
      // Populate dataset metadata
      Promise.all(
        (workspace.datasetIds || []).map(async (dsId) => {
          const ds = await Dataset.findOne({ _id: dsId });
          if (!ds) return null;
          return {
            _id: ds._id,
            name: ds.name,
            originalFileName: ds.originalFileName,
            rowCount: ds.rowCount,
            columnCount: ds.columnCount,
            columns: ds.columns,
            parameters: ds.parameters,
            locations: ds.locations || [],
            hasCoordinates: ds.hasCoordinates,
            dateRange: ds.dateRange,
          };
        })
      ),
      SavedAnalysis.find({ workspaceId: wsId }),
      WorkspaceNote.find({ workspaceId: wsId }),
      ResearchOutput.find({ _id: { $in: workspace.researchOutputIds || [] } }),
      WorkspaceActivity.find({ workspaceId: wsId }),
    ]);

    const cleanDatasets = attachedDatasets.filter(Boolean);

    return res.status(200).json({
      success: true,
      data: {
        ...workspace,
        datasets: cleanDatasets,
        analyses: savedAnalyses,
        notes,
        outputs,
        activities,
        access,
      },
    });
  } catch (error) {
    console.error('[Get Workspace Detail Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new research workspace
// @route   POST /api/workspaces
// @access  Private
export const createWorkspace = async (req, res) => {
  try {
    const { title, researchQuestion, description = '', visibility = 'private', tags = [] } = req.body;

    if (!title || title.trim().length < 3 || title.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Workspace title is required and must be between 3 and 100 characters.',
      });
    }

    if (!researchQuestion || researchQuestion.trim().length < 10 || researchQuestion.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Research question is required and must be between 10 and 500 characters.',
      });
    }

    const userId = req.user._id.toString();

    const newWorkspace = await ResearchWorkspace.create({
      title: title.trim(),
      researchQuestion: researchQuestion.trim(),
      description: description.trim(),
      ownerId: userId,
      visibility,
      tags: Array.isArray(tags) ? tags.map((t) => t.trim()).filter(Boolean) : [],
      members: [
        {
          userId: userId,
          name: req.user.name,
          email: req.user.email,
          role: 'owner',
          addedAt: new Date(),
        },
      ],
      datasetIds: [],
      researchOutputIds: [],
      archivedAt: null,
    });

    await logActivity({
      workspaceId: newWorkspace._id.toString(),
      actorId: userId,
      actorName: req.user.name,
      action: 'created',
      targetType: 'workspace',
      targetId: newWorkspace._id.toString(),
      summary: `Created research workspace '${newWorkspace.title}'`,
    });

    return res.status(201).json({
      success: true,
      message: 'Research workspace created successfully.',
      data: newWorkspace,
    });
  } catch (error) {
    console.error('[Create Workspace Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update workspace details
// @route   PATCH /api/workspaces/:id
// @access  Private (Owner/Editor)
export const updateWorkspace = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({
        success: false,
        message: access.isArchived
          ? 'Cannot edit an archived workspace. Please restore it first.'
          : 'Access denied: Only workspace owners and editors can update workspace details.',
      });
    }

    const { title, researchQuestion, description, visibility, tags } = req.body;
    const updates = {};

    if (title !== undefined) {
      if (title.trim().length < 3 || title.trim().length > 100) {
        return res.status(400).json({ success: false, message: 'Title must be 3-100 characters.' });
      }
      updates.title = title.trim();
    }

    if (researchQuestion !== undefined) {
      if (researchQuestion.trim().length < 10 || researchQuestion.trim().length > 500) {
        return res.status(400).json({ success: false, message: 'Research question must be 10-500 characters.' });
      }
      updates.researchQuestion = researchQuestion.trim();
    }

    if (description !== undefined) updates.description = description.trim();
    if (visibility !== undefined) updates.visibility = visibility;
    if (tags !== undefined && Array.isArray(tags)) updates.tags = tags.map((t) => t.trim()).filter(Boolean);

    const updated = await ResearchWorkspace.findByIdAndUpdate(req.params.id, updates, { new: true });

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'updated',
      targetType: 'workspace',
      targetId: req.params.id,
      summary: `Updated workspace metadata`,
    });

    return res.status(200).json({ success: true, message: 'Workspace updated successfully.', data: updated });
  } catch (error) {
    console.error('[Update Workspace Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Archive workspace (Owner only)
// @route   POST /api/workspaces/:id/archive
// @access  Private (Owner only)
export const archiveWorkspace = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.isOwner && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only the workspace owner can archive this workspace.' });
    }

    const updated = await ResearchWorkspace.findByIdAndUpdate(req.params.id, { archivedAt: new Date() }, { new: true });

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'archived',
      targetType: 'workspace',
      targetId: req.params.id,
      summary: `Archived research workspace`,
    });

    return res.status(200).json({ success: true, message: 'Workspace archived.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Restore archived workspace (Owner only)
// @route   POST /api/workspaces/:id/restore
// @access  Private (Owner only)
export const restoreWorkspace = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.isOwner && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only the workspace owner can restore this workspace.' });
    }

    const updated = await ResearchWorkspace.findByIdAndUpdate(req.params.id, { archivedAt: null }, { new: true });

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'restored',
      targetType: 'workspace',
      targetId: req.params.id,
      summary: `Restored workspace from archive`,
    });

    return res.status(200).json({ success: true, message: 'Workspace restored.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete workspace (Owner only, preserves linked datasets and research outputs)
// @route   DELETE /api/workspaces/:id
// @access  Private (Owner only)
export const deleteWorkspace = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.isOwner && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only the workspace owner can delete this workspace.' });
    }

    // Cascade delete only internal notes, analyses, and activities
    await Promise.all([
      WorkspaceNote.deleteMany({ workspaceId: req.params.id }),
      SavedAnalysis.deleteMany({ workspaceId: req.params.id }),
      WorkspaceActivity.deleteMany({ workspaceId: req.params.id }),
      ResearchWorkspace.findByIdAndDelete(req.params.id),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Workspace deleted. Linked source datasets and external research outputs remain intact.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Attach dataset reference to workspace
// @route   POST /api/workspaces/:id/datasets
// @access  Private (Owner/Editor)
export const attachDataset = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({
        success: false,
        message: access.isArchived ? 'Workspace is archived.' : 'Only owners and editors can attach datasets.',
      });
    }

    const { datasetId } = req.body;
    if (!datasetId) return res.status(400).json({ success: false, message: 'datasetId is required.' });

    // Verify dataset exists and user has permission to it
    const dataset = await Dataset.findOne({ _id: datasetId });
    if (!dataset) return res.status(404).json({ success: false, message: 'Dataset not found.' });

    const canAccessDataset =
      dataset.userId === 'all' || dataset.userId?.toString() === userId || req.user.role === 'Admin';
    if (!canAccessDataset) {
      return res.status(403).json({ success: false, message: 'You do not have permission to attach this dataset.' });
    }

    // Check duplicate
    const alreadyAttached = (workspace.datasetIds || []).some((id) => id.toString() === datasetId.toString());
    if (alreadyAttached) {
      return res.status(400).json({ success: false, message: 'Dataset is already attached to this workspace.' });
    }

    const updated = await ResearchWorkspace.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { datasetIds: datasetId } },
      { new: true }
    );

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'dataset_linked',
      targetType: 'dataset',
      targetId: datasetId,
      summary: `Attached dataset '${dataset.name}'`,
    });

    return res.status(200).json({ success: true, message: 'Dataset attached successfully.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Detach dataset reference from workspace
// @route   DELETE /api/workspaces/:id/datasets/:datasetId
// @access  Private (Owner/Editor)
export const detachDataset = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({ success: false, message: 'Permission denied to detach dataset.' });
    }

    const { datasetId } = req.params;

    const updated = await ResearchWorkspace.findByIdAndUpdate(
      req.params.id,
      { $pull: { datasetIds: datasetId } },
      { new: true }
    );

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'dataset_unlinked',
      targetType: 'dataset',
      targetId: datasetId,
      summary: `Detached dataset from workspace`,
    });

    return res.status(200).json({ success: true, message: 'Dataset reference detached.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List saved analyses in workspace
// @route   GET /api/workspaces/:id/analyses
// @access  Private (Members)
export const getWorkspaceAnalyses = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.isMember && workspace.visibility !== 'public') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const analyses = await SavedAnalysis.find({ workspaceId: req.params.id });
    return res.status(200).json({ success: true, count: analyses.length, data: analyses });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save analysis snapshot to workspace
// @route   POST /api/workspaces/:id/analyses
// @access  Private (Owner/Editor)
export const saveAnalysisToWorkspace = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({
        success: false,
        message: access.isArchived ? 'Workspace is archived.' : 'Only owners and editors can save analyses.',
      });
    }

    const {
      title,
      analysisType = 'correlation',
      sourceA,
      sourceB,
      dateRange,
      alignmentPolicy,
      missingPolicy,
      method,
      coefficient,
      sampleCount,
      excludedCount,
      strengthLabel,
      strengthBand,
      direction,
      scatterPoints,
      timeSeriesPoints,
      caveats,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Analysis title is required.' });
    }

    const saved = await SavedAnalysis.create({
      workspaceId: req.params.id,
      title: title.trim(),
      analysisType,
      sourceA,
      sourceB,
      dateRange,
      alignmentPolicy,
      missingPolicy,
      method,
      coefficient,
      sampleCount,
      excludedCount,
      strengthLabel,
      strengthBand,
      direction,
      scatterPoints,
      timeSeriesPoints,
      caveats,
      snapshotAt: new Date(),
      createdBy: userId,
      authorName: req.user.name,
    });

    // Also auto-attach source dataset references to workspace if not already attached
    const dsToAttach = [sourceA?.datasetId, sourceB?.datasetId].filter(Boolean);
    for (const dId of dsToAttach) {
      if (!(workspace.datasetIds || []).some((id) => id.toString() === dId.toString())) {
        await ResearchWorkspace.findByIdAndUpdate(req.params.id, { $addToSet: { datasetIds: dId } });
      }
    }

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'analysis_saved',
      targetType: 'analysis',
      targetId: saved._id.toString(),
      summary: `Saved correlation snapshot '${saved.title}' (r = ${coefficient})`,
    });

    return res.status(201).json({ success: true, message: 'Analysis saved to workspace.', data: saved });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete saved analysis snapshot
// @route   DELETE /api/workspaces/:id/analyses/:analysisId
// @access  Private (Owner/Editor)
export const deleteWorkspaceAnalysis = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({ success: false, message: 'Permission denied to delete analysis.' });
    }

    const deleted = await SavedAnalysis.findByIdAndDelete(req.params.analysisId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Analysis not found.' });

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'analysis_removed',
      targetType: 'analysis',
      targetId: req.params.analysisId,
      summary: `Removed analysis snapshot '${deleted.title}'`,
    });

    return res.status(200).json({ success: true, message: 'Analysis snapshot deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create research note
// @route   POST /api/workspaces/:id/notes
// @access  Private (Owner/Editor)
export const createNote = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({
        success: false,
        message: access.isArchived ? 'Workspace is archived.' : 'Only owners and editors can add notes.',
      });
    }

    const { title, body } = req.body;
    if (!title || !title.trim() || !body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Note title and body are required.' });
    }

    const note = await WorkspaceNote.create({
      workspaceId: req.params.id,
      title: title.trim(),
      body: body.trim(),
      authorId: userId,
      authorName: req.user.name,
    });

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'note_added',
      targetType: 'note',
      targetId: note._id.toString(),
      summary: `Added research note: '${note.title}'`,
    });

    return res.status(201).json({ success: true, message: 'Note added successfully.', data: note });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update research note
// @route   PATCH /api/workspaces/:id/notes/:noteId
// @access  Private (Owner/Editor/Author)
export const updateNote = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({ success: false, message: 'Cannot edit note in this workspace.' });
    }

    const note = await WorkspaceNote.findById(req.params.noteId);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    // Allow owner, editor, or note author to edit
    const { title, body } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (body !== undefined) updates.body = body;

    const updated = await WorkspaceNote.findByIdAndUpdate(req.params.noteId, updates, { new: true });

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'note_edited',
      targetType: 'note',
      targetId: req.params.noteId,
      summary: `Edited research note: '${updated.title}'`,
    });

    return res.status(200).json({ success: true, message: 'Note updated.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete research note
// @route   DELETE /api/workspaces/:id/notes/:noteId
// @access  Private (Owner/Editor/Author)
export const deleteNote = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({ success: false, message: 'Cannot delete note.' });
    }

    const deleted = await WorkspaceNote.findByIdAndDelete(req.params.noteId);
    if (!deleted) return res.status(404).json({ success: false, message: 'Note not found.' });

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'note_deleted',
      targetType: 'note',
      targetId: req.params.noteId,
      summary: `Deleted research note '${deleted.title}'`,
    });

    return res.status(200).json({ success: true, message: 'Note deleted.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Link or create research output in workspace
// @route   POST /api/workspaces/:id/outputs
// @access  Private (Owner/Editor)
export const linkResearchOutput = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({ success: false, message: 'Only owners and editors can link research outputs.' });
    }

    const { title, type = 'report', summary = '', url = '', doi = '', authors = [] } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Research output title is required.' });
    }

    const output = await ResearchOutput.create({
      title: title.trim(),
      type,
      summary: summary.trim(),
      url: url.trim(),
      doi: doi.trim(),
      authors: Array.isArray(authors) ? authors : [req.user.name],
      createdBy: userId,
    });

    await ResearchWorkspace.findByIdAndUpdate(req.params.id, {
      $addToSet: { researchOutputIds: output._id },
    });

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'output_linked',
      targetType: 'output',
      targetId: output._id.toString(),
      summary: `Linked research output: '${output.title}'`,
    });

    return res.status(201).json({ success: true, message: 'Research output linked.', data: output });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unlink research output
// @route   DELETE /api/workspaces/:id/outputs/:outputId
// @access  Private (Owner/Editor)
export const unlinkResearchOutput = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canEdit) {
      return res.status(403).json({ success: false, message: 'Permission denied.' });
    }

    await ResearchWorkspace.findByIdAndUpdate(req.params.id, {
      $pull: { researchOutputIds: req.params.outputId },
    });

    return res.status(200).json({ success: true, message: 'Research output unlinked.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add collaborator (Owner only)
// @route   POST /api/workspaces/:id/members
// @access  Private (Owner only)
export const addMember = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canManageMembers && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: access.isArchived ? 'Workspace is archived.' : 'Only the workspace owner can manage collaborators.',
      });
    }

    const { email, role = 'viewer' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'User email is required.' });

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Collaborator role must be Editor or Viewer.' });
    }

    const userToAdd = await User.findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ success: false, message: `No registered user found with email '${email}'.` });
    }

    const targetUserId = userToAdd._id.toString();

    // Check if already owner or member
    if (workspace.ownerId?.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: 'User is already the workspace owner.' });
    }

    const alreadyMember = (workspace.members || []).some((m) => m.userId?.toString() === targetUserId);
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a collaborator in this workspace.' });
    }

    const newMemberObj = {
      userId: targetUserId,
      name: userToAdd.name,
      email: userToAdd.email,
      role,
      addedAt: new Date(),
    };

    const updated = await ResearchWorkspace.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: newMemberObj } },
      { new: true }
    );

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'member_added',
      targetType: 'member',
      targetId: targetUserId,
      summary: `Added ${userToAdd.name} (${userToAdd.email}) as ${role}`,
    });

    return res.status(200).json({
      success: true,
      message: `Collaborator ${userToAdd.name} added as ${role}.`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update collaborator role (Owner only)
// @route   PATCH /api/workspaces/:id/members/:memberUserId
// @access  Private (Owner only)
export const updateMemberRole = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const access = evaluateWorkspaceAccess(workspace, userId);
    if (!access.canManageMembers && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Only workspace owners can modify roles.' });
    }

    const { role } = req.body;
    const targetUserId = req.params.memberUserId;

    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be Editor or Viewer.' });
    }

    if (workspace.ownerId?.toString() === targetUserId) {
      return res.status(400).json({ success: false, message: 'Cannot downgrade the workspace owner.' });
    }

    const members = [...(workspace.members || [])];
    const memberIndex = members.findIndex((m) => m.userId?.toString() === targetUserId);
    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: 'Member not found in this workspace.' });
    }

    members[memberIndex].role = role;

    const updated = await ResearchWorkspace.findByIdAndUpdate(req.params.id, { members }, { new: true });

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'member_role_changed',
      targetType: 'member',
      targetId: targetUserId,
      summary: `Changed ${members[memberIndex].name}'s role to ${role}`,
    });

    return res.status(200).json({ success: true, message: 'Member role updated.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove collaborator (Owner only or self-leave)
// @route   DELETE /api/workspaces/:id/members/:memberUserId
// @access  Private
export const removeMember = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const workspace = await ResearchWorkspace.findById(req.params.id);

    if (!workspace) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const targetUserId = req.params.memberUserId;
    const access = evaluateWorkspaceAccess(workspace, userId);

    const isSelfLeaving = userId === targetUserId;
    if (!access.canManageMembers && !isSelfLeaving && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Permission denied to remove member.' });
    }

    if (workspace.ownerId?.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'The workspace owner cannot be removed. Transfer ownership or delete workspace.',
      });
    }

    const member = (workspace.members || []).find((m) => m.userId?.toString() === targetUserId);

    const updated = await ResearchWorkspace.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: { userId: targetUserId } } },
      { new: true }
    );

    await logActivity({
      workspaceId: req.params.id,
      actorId: userId,
      actorName: req.user.name,
      action: 'member_removed',
      targetType: 'member',
      targetId: targetUserId,
      summary: `Removed ${member?.name || 'collaborator'} from workspace`,
    });

    return res.status(200).json({ success: true, message: 'Collaborator removed.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search registered users to add as collaborator
// @route   GET /api/workspaces/users/search
// @access  Private
export const searchUsers = async (req, res) => {
  try {
    const { q = '' } = req.query;
    const users = await User.find({});
    const currentUserId = req.user._id.toString();

    let list = Array.isArray(users) ? users : [];
    if (typeof users.limit === 'function') {
      list = users.limit(100);
    }

    let filtered = list
      .filter((u) => u._id.toString() !== currentUserId)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
      }));

    if (q.trim()) {
      const term = q.toLowerCase();
      filtered = filtered.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
      );
    }

    return res.status(200).json({ success: true, count: filtered.length, data: filtered });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
