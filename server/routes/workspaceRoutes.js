import express from 'express';
import {
  getWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  archiveWorkspace,
  restoreWorkspace,
  attachDataset,
  detachDataset,
  getWorkspaceAnalyses,
  saveAnalysisToWorkspace,
  deleteWorkspaceAnalysis,
  createNote,
  updateNote,
  deleteNote,
  linkResearchOutput,
  unlinkResearchOutput,
  addMember,
  updateMemberRole,
  removeMember,
  searchUsers,
} from '../controllers/workspaceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All workspace routes are protected
router.use(protect);

// Workspace collection endpoints
router.get('/', getWorkspaces);
router.post('/', createWorkspace);

// Search registered users for member invitation
router.get('/users/search', searchUsers);

// Individual workspace endpoints
router.get('/:id', getWorkspaceById);
router.patch('/:id', updateWorkspace);
router.delete('/:id', deleteWorkspace);

// Lifecycle states
router.post('/:id/archive', archiveWorkspace);
router.post('/:id/restore', restoreWorkspace);

// Dataset references
router.post('/:id/datasets', attachDataset);
router.delete('/:id/datasets/:datasetId', detachDataset);

// Analyses snapshots
router.get('/:id/analyses', getWorkspaceAnalyses);
router.post('/:id/analyses', saveAnalysisToWorkspace);
router.delete('/:id/analyses/:analysisId', deleteWorkspaceAnalysis);

// Research notes
router.post('/:id/notes', createNote);
router.patch('/:id/notes/:noteId', updateNote);
router.delete('/:id/notes/:noteId', deleteNote);

// Research outputs
router.post('/:id/outputs', linkResearchOutput);
router.delete('/:id/outputs/:outputId', unlinkResearchOutput);

// Collaborator membership
router.post('/:id/members', addMember);
router.patch('/:id/members/:memberUserId', updateMemberRole);
router.delete('/:id/members/:memberUserId', removeMember);

export default router;
