/**
 * COMPREHENSIVE TEST SUITE
 * Verifies Correlation Mathematical Engine, Edge Cases,
 * and Workspace Access Control & Permissions.
 */

import { computeCorrelation } from '../services/correlationService.js';
import { evaluateWorkspaceAccess } from '../controllers/workspaceController.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`FAIL: ${testName}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

console.log('--- RUNNING CORRELATION MATHEMATICAL FIXTURE TESTS ---');

// Test 1: Perfect Positive Linear Correlation (r = 1.0)
{
  const mockDatasetA = {
    _id: 'ds_test_a',
    name: 'Test Dataset A',
    records: [
      { date: '2026-01-01', temp: 10 },
      { date: '2026-01-02', temp: 20 },
      { date: '2026-01-03', temp: 30 },
      { date: '2026-01-04', temp: 40 },
      { date: '2026-01-05', temp: 50 },
    ],
  };
  const mockDatasetB = {
    _id: 'ds_test_b',
    name: 'Test Dataset B',
    records: [
      { date: '2026-01-01', heat: 2 },
      { date: '2026-01-02', heat: 4 },
      { date: '2026-01-03', heat: 6 },
      { date: '2026-01-04', heat: 8 },
      { date: '2026-01-05', heat: 10 },
    ],
  };

  const res = computeCorrelation({
    datasetA: mockDatasetA,
    fieldA: 'temp',
    datasetB: mockDatasetB,
    fieldB: 'heat',
  });

  assert(res.valid === true, 'Perfect positive: valid is true');
  assert(res.coefficient === 1.0, `Perfect positive: r = 1.0 (got ${res.coefficient})`);
  assert(res.sampleCount === 5, 'Perfect positive: sampleCount is 5');
  assert(res.direction === 'Positive', 'Perfect positive: direction is Positive');
  assert(res.strengthBand === 'strong', 'Perfect positive: strengthBand is strong');
}

// Test 2: Perfect Negative Linear Correlation (r = -1.0)
{
  const mockDatasetA = {
    _id: 'ds_test_a',
    name: 'Test Dataset A',
    records: [
      { date: '2026-01-01', val: 1 },
      { date: '2026-01-02', val: 2 },
      { date: '2026-01-03', val: 3 },
      { date: '2026-01-04', val: 4 },
      { date: '2026-01-05', val: 5 },
    ],
  };
  const mockDatasetB = {
    _id: 'ds_test_b',
    name: 'Test Dataset B',
    records: [
      { date: '2026-01-01', val: 10 },
      { date: '2026-01-02', val: 8 },
      { date: '2026-01-03', val: 6 },
      { date: '2026-01-04', val: 4 },
      { date: '2026-01-05', val: 2 },
    ],
  };

  const res = computeCorrelation({
    datasetA: mockDatasetA,
    fieldA: 'val',
    datasetB: mockDatasetB,
    fieldB: 'val',
  });

  assert(res.valid === true, 'Perfect negative: valid is true');
  assert(res.coefficient === -1.0, `Perfect negative: r = -1.0 (got ${res.coefficient})`);
  assert(res.direction === 'Negative', 'Perfect negative: direction is Negative');
  assert(res.strengthBand === 'strong', 'Perfect negative: strengthBand is strong');
}

// Test 3: Zero Variance Edge Case Detection
{
  const mockDatasetA = {
    _id: 'ds_const',
    name: 'Constant Dataset',
    records: [
      { date: '2026-01-01', temp: 25 },
      { date: '2026-01-02', temp: 25 },
      { date: '2026-01-03', temp: 25 },
      { date: '2026-01-04', temp: 25 },
    ],
  };
  const mockDatasetB = {
    _id: 'ds_var',
    name: 'Varying Dataset',
    records: [
      { date: '2026-01-01', rain: 10 },
      { date: '2026-01-02', rain: 15 },
      { date: '2026-01-03', rain: 20 },
      { date: '2026-01-04', rain: 25 },
    ],
  };

  const res = computeCorrelation({
    datasetA: mockDatasetA,
    fieldA: 'temp',
    datasetB: mockDatasetB,
    fieldB: 'rain',
  });

  assert(res.valid === false, 'Zero variance: correctly returns valid = false');
  assert(res.reason.includes('Zero variance detected'), 'Zero variance: clear explanation returned');
}

// Test 4: Insufficient Samples (< 3 pairs)
{
  const mockDatasetA = {
    _id: 'ds_small_a',
    records: [
      { date: '2026-01-01', temp: 20 },
      { date: '2026-01-02', temp: 25 },
    ],
  };
  const mockDatasetB = {
    _id: 'ds_small_b',
    records: [
      { date: '2026-01-01', humidity: 60 },
      { date: '2026-01-02', humidity: 70 },
    ],
  };

  const res = computeCorrelation({
    datasetA: mockDatasetA,
    fieldA: 'temp',
    datasetB: mockDatasetB,
    fieldB: 'humidity',
  });

  assert(res.valid === false, 'Insufficient samples: valid = false');
  assert(res.reason.includes('minimum 3 required'), 'Insufficient samples: explanatory reason');
  assert(res.sampleCount === 2, 'Insufficient samples: sampleCount is 2');
}

// Test 5: Pairwise Complete Missing Data Exclusion
{
  const mockDatasetA = {
    _id: 'ds_missing_a',
    records: [
      { date: '2026-01-01', temp: 20 },
      { date: '2026-01-02', temp: null }, // missing
      { date: '2026-01-03', temp: 30 },
      { date: '2026-01-04', temp: 40 },
      { date: '2026-01-05', temp: 50 },
    ],
  };
  const mockDatasetB = {
    _id: 'ds_missing_b',
    records: [
      { date: '2026-01-01', humidity: 50 },
      { date: '2026-01-02', humidity: 60 },
      { date: '2026-01-03', humidity: NaN }, // missing
      { date: '2026-01-04', humidity: 80 },
      { date: '2026-01-05', humidity: 90 },
    ],
  };

  const res = computeCorrelation({
    datasetA: mockDatasetA,
    fieldA: 'temp',
    datasetB: mockDatasetB,
    fieldB: 'humidity',
  });

  assert(res.valid === true, 'Missing data: valid = true');
  assert(res.sampleCount === 3, `Missing data: sampleCount is 3 (got ${res.sampleCount})`);
  assert(res.excludedCount === 2, `Missing data: excludedCount is 2 (got ${res.excludedCount})`);
}

// Test 6: Location and Date Alignment
{
  const mockDatasetA = {
    _id: 'ds_loc_a',
    records: [
      { date: '2026-01-01', location: 'Delhi', temp: 15 },
      { date: '2026-01-01', location: 'Chennai', temp: 30 },
      { date: '2026-01-02', location: 'Delhi', temp: 16 },
      { date: '2026-01-02', location: 'Chennai', temp: 31 },
      { date: '2026-01-03', location: 'Delhi', temp: 17 },
      { date: '2026-01-03', location: 'Chennai', temp: 32 },
    ],
  };
  const mockDatasetB = {
    _id: 'ds_loc_b',
    records: [
      { date: '2026-01-01', location: 'Chennai', rain: 0 },
      { date: '2026-01-01', location: 'Delhi', rain: 2 },
      { date: '2026-01-02', location: 'Chennai', rain: 1 },
      { date: '2026-01-02', location: 'Delhi', rain: 3 },
      { date: '2026-01-03', location: 'Chennai', rain: 2 },
      { date: '2026-01-03', location: 'Delhi', rain: 4 },
    ],
  };

  const resChennai = computeCorrelation({
    datasetA: mockDatasetA,
    fieldA: 'temp',
    locationA: 'Chennai',
    datasetB: mockDatasetB,
    fieldB: 'rain',
    locationB: 'Chennai',
  });

  assert(resChennai.valid === true, 'Location filter: valid = true');
  assert(resChennai.sampleCount === 3, 'Location filter: matched 3 Chennai rows');
  assert(resChennai.coefficient === 1.0, 'Location filter: Chennai temp vs rain r = 1.0');
}

console.log('\n--- RUNNING WORKSPACE ROLE-BASED ACCESS CONTROL TESTS ---');

// Test 7: Owner Permissions
{
  const ws = {
    _id: 'ws_test_1',
    ownerId: 'usr_owner_123',
    visibility: 'private',
    members: [{ userId: 'usr_owner_123', role: 'owner' }],
    archivedAt: null,
  };

  const access = evaluateWorkspaceAccess(ws, 'usr_owner_123');
  assert(access.isOwner === true, 'Owner: isOwner is true');
  assert(access.canEdit === true, 'Owner: canEdit is true');
  assert(access.canManageMembers === true, 'Owner: canManageMembers is true');
  assert(access.isArchived === false, 'Owner: isArchived is false');
}

// Test 8: Editor Permissions
{
  const ws = {
    _id: 'ws_test_2',
    ownerId: 'usr_owner_123',
    visibility: 'private',
    members: [
      { userId: 'usr_owner_123', role: 'owner' },
      { userId: 'usr_editor_456', role: 'editor' },
    ],
    archivedAt: null,
  };

  const access = evaluateWorkspaceAccess(ws, 'usr_editor_456');
  assert(access.isOwner === false, 'Editor: isOwner is false');
  assert(access.isEditor === true, 'Editor: isEditor is true');
  assert(access.canEdit === true, 'Editor: canEdit is true');
  assert(access.canManageMembers === false, 'Editor: cannot manage members');
}

// Test 9: Viewer Permissions
{
  const ws = {
    _id: 'ws_test_3',
    ownerId: 'usr_owner_123',
    visibility: 'private',
    members: [
      { userId: 'usr_owner_123', role: 'owner' },
      { userId: 'usr_viewer_789', role: 'viewer' },
    ],
    archivedAt: null,
  };

  const access = evaluateWorkspaceAccess(ws, 'usr_viewer_789');
  assert(access.isViewer === true, 'Viewer: isViewer is true');
  assert(access.canEdit === false, 'Viewer: canEdit is false');
  assert(access.canManageMembers === false, 'Viewer: cannot manage members');
}

// Test 10: Non-Member Access
{
  const ws = {
    _id: 'ws_test_4',
    ownerId: 'usr_owner_123',
    visibility: 'private',
    members: [{ userId: 'usr_owner_123', role: 'owner' }],
    archivedAt: null,
  };

  const access = evaluateWorkspaceAccess(ws, 'usr_stranger_000');
  assert(access.isMember === false, 'Stranger: isMember is false');
  assert(access.canEdit === false, 'Stranger: canEdit is false');
  assert(access.role === null, 'Stranger: role is null');
}

// Test 11: Archived Workspace Enforces Read-Only
{
  const ws = {
    _id: 'ws_test_5',
    ownerId: 'usr_owner_123',
    visibility: 'private',
    members: [
      { userId: 'usr_owner_123', role: 'owner' },
      { userId: 'usr_editor_456', role: 'editor' },
    ],
    archivedAt: new Date('2026-01-01'),
  };

  const ownerAccess = evaluateWorkspaceAccess(ws, 'usr_owner_123');
  const editorAccess = evaluateWorkspaceAccess(ws, 'usr_editor_456');

  assert(ownerAccess.isArchived === true, 'Archived: isArchived is true');
  assert(ownerAccess.canEdit === false, 'Archived: owner cannot edit content while archived');
  assert(editorAccess.canEdit === false, 'Archived: editor cannot edit');
}

console.log(`\n========================================`);
console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} (100% success rate)`);
console.log(`========================================\n`);
