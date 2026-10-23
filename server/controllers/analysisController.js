import Dataset from '../models/Dataset.js';
import SavedAnalysis from '../models/SavedAnalysis.js';
import ResearchWorkspace from '../models/ResearchWorkspace.js';
import { computeCorrelation } from '../services/correlationService.js';

/**
 * ANALYSIS CONTROLLER
 * Handles climate event correlation computation and saved analysis retrieval.
 */

// @desc    Run correlation analysis between two climate variables
// @route   POST /api/analyses/correlation
// @access  Private (JWT protected)
export const runCorrelationAnalysis = async (req, res) => {
  try {
    const {
      sourceA,
      sourceB,
      dateRange = {},
      method = 'pearson',
      alignmentPolicy = 'exact_date',
      missingPolicy = 'pairwise_complete',
    } = req.body;

    if (!sourceA || !sourceA.datasetId || !sourceA.field) {
      return res.status(400).json({
        success: false,
        message: 'Source A dataset ID and variable field must be specified.',
      });
    }

    if (!sourceB || !sourceB.datasetId || !sourceB.field) {
      return res.status(400).json({
        success: false,
        message: 'Source B dataset ID and variable field must be specified.',
      });
    }

    const userId = req.user._id.toString();

    // Check accessibility for Dataset A
    const datasetA = await Dataset.findOne({ _id: sourceA.datasetId });
    if (!datasetA) {
      return res.status(404).json({ success: false, message: 'Source A dataset not found.' });
    }
    const canAccessA =
      datasetA.userId === 'all' ||
      datasetA.userId?.toString() === userId ||
      req.user.role === 'Admin';
    if (!canAccessA) {
      return res.status(403).json({ success: false, message: 'Access denied to Source A dataset.' });
    }

    // Check accessibility for Dataset B
    const datasetB =
      sourceA.datasetId === sourceB.datasetId
        ? datasetA
        : await Dataset.findOne({ _id: sourceB.datasetId });

    if (!datasetB) {
      return res.status(404).json({ success: false, message: 'Source B dataset not found.' });
    }
    const canAccessB =
      datasetB.userId === 'all' ||
      datasetB.userId?.toString() === userId ||
      req.user.role === 'Admin';
    if (!canAccessB) {
      return res.status(403).json({ success: false, message: 'Access denied to Source B dataset.' });
    }

    // Verify fields exist in datasets
    const fieldsA = (datasetA.columns || []).map((c) => c.toLowerCase());
    const fieldsB = (datasetB.columns || []).map((c) => c.toLowerCase());

    if (!fieldsA.includes(sourceA.field.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Field '${sourceA.field}' not found in Source A dataset columns.`,
      });
    }
    if (!fieldsB.includes(sourceB.field.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Field '${sourceB.field}' not found in Source B dataset columns.`,
      });
    }

    // Execute correlation computation
    const result = computeCorrelation({
      datasetA,
      fieldA: sourceA.field,
      locationA: sourceA.location,
      datasetB,
      fieldB: sourceB.field,
      locationB: sourceB.location,
      dateRange,
      method,
      alignmentPolicy,
      missingPolicy,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[Run Correlation Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get saved analysis by ID with workspace permission check
// @route   GET /api/analyses/:id
// @access  Private (JWT protected)
export const getSavedAnalysis = async (req, res) => {
  try {
    const analysis = await SavedAnalysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Saved analysis not found.' });
    }

    const userId = req.user._id.toString();

    // Verify user has access to the workspace containing this analysis
    const workspace = await ResearchWorkspace.findById(analysis.workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Associated workspace not found.' });
    }

    const isOwner = workspace.ownerId?.toString() === userId;
    const isMember = (workspace.members || []).some((m) => m.userId?.toString() === userId);
    const isPublic = workspace.visibility === 'public';

    if (!isOwner && !isMember && !isPublic) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view analyses in this workspace.',
      });
    }

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('[Get Saved Analysis Error]', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
