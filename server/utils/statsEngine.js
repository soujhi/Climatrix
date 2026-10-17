/**
 * STATISTICS CALCULATION ENGINE
 * Calculates count, min, max, mean, median, and standard deviation for a given array of numbers.
 */
export const calculateFieldStatistics = (values) => {
  const nums = values.filter((val) => typeof val === 'number' && !isNaN(val)).sort((a, b) => a - b);
  const count = nums.length;

  if (count === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
  }

  const min = nums[0];
  const max = nums[count - 1];
  const sum = nums.reduce((acc, curr) => acc + curr, 0);
  const mean = parseFloat((sum / count).toFixed(2));

  // Median calculation
  let median = 0;
  const mid = Math.floor(count / 2);
  if (count % 2 === 0) {
    median = parseFloat(((nums[mid - 1] + nums[mid]) / 2).toFixed(2));
  } else {
    median = parseFloat(nums[mid].toFixed(2));
  }

  // Standard Deviation calculation
  const variance = nums.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const stdDev = parseFloat(Math.sqrt(variance).toFixed(2));

  return {
    count,
    min,
    max,
    mean,
    median,
    stdDev,
  };
};
