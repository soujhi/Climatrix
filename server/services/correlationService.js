/**
 * CORRELATION SERVICE
 * Mathematical computation and alignment engine for Climate Event Correlation Explorer.
 * Implements Pearson correlation, pairwise-complete matching, zero-variance checks,
 * and descriptive strength categorization.
 */

// Parameter to standard unit dictionary
export const PARAMETER_UNITS = {
  temperature: '°C',
  rainfall: 'mm',
  humidity: '%',
  wind_speed: 'km/h',
  pressure: 'hPa',
  solar_radiation: 'W/m²',
  co2: 'ppm',
  air_quality: 'AQI',
};

export const getUnitForField = (fieldName) => {
  if (!fieldName) return 'units';
  const lower = fieldName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  for (const [key, unit] of Object.entries(PARAMETER_UNITS)) {
    if (lower.includes(key)) return unit;
  }
  return 'units';
};

/**
 * Normalizes a date to YYYY-MM-DD
 */
export const toISODateString = (dateInput) => {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

/**
 * Computes Pearson correlation and aligns observation pairs
 */
export const computeCorrelation = ({
  datasetA,
  fieldA,
  locationA,
  datasetB,
  fieldB,
  locationB,
  dateRange = {},
  method = 'pearson',
  alignmentPolicy = 'exact_date',
  missingPolicy = 'pairwise_complete',
}) => {
  if (!datasetA || !datasetB) {
    throw new Error('Both Source A and Source B datasets must be provided.');
  }
  if (!fieldA || !fieldB) {
    throw new Error('Numeric fields for both Source A and Source B must be selected.');
  }

  const unitA = getUnitForField(fieldA);
  const unitB = getUnitForField(fieldB);

  const startDate = dateRange.start ? toISODateString(dateRange.start) : null;
  const endDate = dateRange.end ? toISODateString(dateRange.end) : null;

  // Extract observations from dataset A
  // Key format: if locations are matched, use `${date}__${location}` else `${date}`
  const mapA = new Map();
  let totalCandidatesA = 0;

  for (const r of datasetA.records || []) {
    const dStr = toISODateString(r.date);
    if (!dStr) continue;
    if (startDate && dStr < startDate) continue;
    if (endDate && dStr > endDate) continue;

    const loc = (r.location || '').trim();
    if (locationA && locationA !== 'all' && loc && loc.toLowerCase() !== locationA.toLowerCase()) {
      continue;
    }

    const key = locationA && locationB ? `${dStr}__${loc.toLowerCase()}` : dStr;
    const val = r[fieldA.toLowerCase()] ?? r[fieldA];
    const num = val !== null && val !== undefined && val !== '' ? Number(val) : NaN;

    mapA.set(key, { date: dStr, location: loc, val: num });
    totalCandidatesA++;
  }

  // Extract observations from dataset B and align
  const alignedPairs = [];
  let excludedCount = 0;
  let totalMatchedSlots = 0;

  for (const r of datasetB.records || []) {
    const dStr = toISODateString(r.date);
    if (!dStr) continue;
    if (startDate && dStr < startDate) continue;
    if (endDate && dStr > endDate) continue;

    const loc = (r.location || '').trim();
    if (locationB && locationB !== 'all' && loc && loc.toLowerCase() !== locationB.toLowerCase()) {
      continue;
    }

    const key = locationA && locationB ? `${dStr}__${loc.toLowerCase()}` : dStr;
    const itemA = mapA.get(key);
    if (!itemA) continue;

    totalMatchedSlots++;
    const valB = r[fieldB.toLowerCase()] ?? r[fieldB];
    const numB = valB !== null && valB !== undefined && valB !== '' ? Number(valB) : NaN;
    const numA = itemA.val;

    if (Number.isFinite(numA) && Number.isFinite(numB)) {
      alignedPairs.push({
        date: dStr,
        location: loc || itemA.location || 'Station',
        x: numA,
        y: numB,
      });
    } else {
      excludedCount++;
    }
  }

  // Sort aligned observations chronologically
  alignedPairs.sort((a, b) => a.date.localeCompare(b.date));

  const sampleCount = alignedPairs.length;

  // Verification 1: Minimum sample size check
  if (sampleCount < 3) {
    return {
      valid: false,
      reason: `Insufficient matched observations (${sampleCount} pair${sampleCount === 1 ? '' : 's'} found; minimum 3 required for meaningful linear correlation).`,
      sampleCount,
      excludedCount,
      sourceA: { name: datasetA.name, field: fieldA, unit: unitA, location: locationA || 'All' },
      sourceB: { name: datasetB.name, field: fieldB, unit: unitB, location: locationB || 'All' },
      dateRange: { start: startDate, end: endDate },
      method,
      alignmentPolicy,
      missingPolicy,
      caveats: 'A minimum of 3 pairwise-complete observations is mathematically required to calculate correlation and standard error.',
    };
  }

  // Compute mathematical means
  let sumX = 0;
  let sumY = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of alignedPairs) {
    sumX += p.x;
    sumY += p.y;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const meanX = sumX / sampleCount;
  const meanY = sumY / sampleCount;

  // Compute Sum of Squares (variance components) and Covariance
  let ssXX = 0;
  let ssYY = 0;
  let ssXY = 0;

  for (const p of alignedPairs) {
    const diffX = p.x - meanX;
    const diffY = p.y - meanY;
    ssXX += diffX * diffX;
    ssYY += diffY * diffY;
    ssXY += diffX * diffY;
  }

  const varianceX = ssXX / (sampleCount - 1);
  const varianceY = ssYY / (sampleCount - 1);
  const stdDevX = Math.sqrt(varianceX);
  const stdDevY = Math.sqrt(varianceY);

  // Verification 2: Zero variance check
  if (ssXX === 0 || ssYY === 0 || stdDevX === 0 || stdDevY === 0) {
    const constantVar = ssXX === 0 && ssYY === 0 ? 'Both variables' : ssXX === 0 ? fieldA : fieldB;
    return {
      valid: false,
      reason: `Zero variance detected: ${constantVar} remained completely constant across all matched dates. Correlation cannot be evaluated with zero variation.`,
      sampleCount,
      excludedCount,
      sourceA: { name: datasetA.name, field: fieldA, unit: unitA, mean: Number(meanX.toFixed(2)), stdDev: 0 },
      sourceB: { name: datasetB.name, field: fieldB, unit: unitB, mean: Number(meanY.toFixed(2)), stdDev: 0 },
      dateRange: { start: startDate, end: endDate },
      method,
      alignmentPolicy,
      missingPolicy,
    };
  }

  // Pearson Correlation Coefficient calculation
  let r = ssXY / (Math.sqrt(ssXX) * Math.sqrt(ssYY));

  // Bound check and clamp against precision errors
  if (r > 1) r = 1;
  if (r < -1) r = -1;
  if (isNaN(r)) r = 0;

  r = Number(r.toFixed(4));

  // Descriptive strength band categorization (Heuristic guidelines)
  const absR = Math.abs(r);
  let strengthLabel = 'Very weak or negligible association';
  let strengthBand = 'negligible';

  if (absR >= 0.7) {
    strengthLabel = 'Strong linear association';
    strengthBand = 'strong';
  } else if (absR >= 0.4) {
    strengthLabel = 'Moderate linear association';
    strengthBand = 'moderate';
  } else if (absR >= 0.2) {
    strengthLabel = 'Weak linear association';
    strengthBand = 'weak';
  }

  const direction = r > 0.05 ? 'Positive' : r < -0.05 ? 'Negative' : 'Neutral';

  // Construct scatter plot dataset (X, Y, metadata)
  const scatterPoints = alignedPairs.map((p) => ({
    x: Number(p.x.toFixed(2)),
    y: Number(p.y.toFixed(2)),
    date: p.date,
    location: p.location,
  }));

  // Construct dual-axis time-series dataset
  const timeSeriesPoints = alignedPairs.map((p) => ({
    date: p.date,
    location: p.location,
    [fieldA]: Number(p.x.toFixed(2)),
    [fieldB]: Number(p.y.toFixed(2)),
  }));

  return {
    valid: true,
    coefficient: r,
    sampleCount,
    excludedCount,
    strengthLabel,
    strengthBand,
    direction,
    method,
    alignmentPolicy,
    missingPolicy,
    calculatedAt: new Date().toISOString(),
    sourceA: {
      datasetId: datasetA._id,
      datasetName: datasetA.name,
      field: fieldA,
      unit: unitA,
      location: locationA || 'All',
      mean: Number(meanX.toFixed(2)),
      stdDev: Number(stdDevX.toFixed(2)),
      min: Number(minX.toFixed(2)),
      max: Number(maxX.toFixed(2)),
    },
    sourceB: {
      datasetId: datasetB._id,
      datasetName: datasetB.name,
      field: fieldB,
      unit: unitB,
      location: locationB || 'All',
      mean: Number(meanY.toFixed(2)),
      stdDev: Number(stdDevY.toFixed(2)),
      min: Number(minY.toFixed(2)),
      max: Number(maxY.toFixed(2)),
    },
    dateRange: {
      start: alignedPairs[0]?.date || startDate,
      end: alignedPairs[alignedPairs.length - 1]?.date || endDate,
    },
    scatterPoints,
    timeSeriesPoints,
    caveats:
      'Correlation measures linear co-variation, not causal relationship. Confounding climate factors, localized topography, seasonal cycles, and sampling gaps may explain or mask correlations.',
  };
};
