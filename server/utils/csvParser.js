import fs from 'fs';
import csvParser from 'csv-parser';

/**
 * CSV PARSER & VALIDATOR UTILITY
 * Reads a uploaded CSV file, validates headers, row integrity, detects numeric climate fields,
 * checks lat/long geographic ranges, and counts missing values.
 */
export const parseAndValidateCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const records = [];
    let columns = [];
    let missingValueCount = 0;

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('headers', (headers) => {
        columns = headers.map((h) => h.trim());
      })
      .on('data', (row) => {
        const cleanRow = {};
        let rowHasMissing = false;

        Object.keys(row).forEach((key) => {
          const cleanKey = key.trim().toLowerCase();
          const val = row[key] ? row[key].trim() : '';

          if (val === '' || val === null || val === undefined || val === 'NaN' || val === 'N/A') {
            rowHasMissing = true;
            missingValueCount++;
            cleanRow[cleanKey] = null;
          } else {
            // Numeric detection for climate values & coordinates
            const numVal = Number(val);
            if (!isNaN(numVal) && cleanKey !== 'date' && cleanKey !== 'location') {
              cleanRow[cleanKey] = numVal;
            } else {
              cleanRow[cleanKey] = val;
            }
          }
        });

        records.push(cleanRow);
      })
      .on('end', () => {
        if (records.length === 0) {
          return reject(new Error('Uploaded CSV file is empty or missing content rows.'));
        }

        // Validate Latitude & Longitude if present
        let hasCoordinates = false;
        const firstRowKeys = Object.keys(records[0]);
        const hasLat = firstRowKeys.includes('latitude') || firstRowKeys.includes('lat');
        const hasLng = firstRowKeys.includes('longitude') || firstRowKeys.includes('lon') || firstRowKeys.includes('lng');

        if (hasLat && hasLng) {
          hasCoordinates = true;
          // Validate range [-90, 90] for Lat and [-180, 180] for Long
          for (const rec of records) {
            const lat = rec.latitude ?? rec.lat;
            const lng = rec.longitude ?? rec.lon ?? rec.lng;
            if (lat !== null && (lat < -90 || lat > 90)) {
              return reject(new Error(`Invalid Latitude value '${lat}'. Must be between -90 and 90.`));
            }
            if (lng !== null && (lng < -180 || lng > 180)) {
              return reject(new Error(`Invalid Longitude value '${lng}'. Must be between -180 and 180.`));
            }
          }
        }

        // Detect parameters (numeric fields excluding latitude/longitude)
        const parameters = [];
        const candidateKeys = ['temperature', 'rainfall', 'humidity', 'wind_speed'];
        
        firstRowKeys.forEach((k) => {
          if (!['date', 'location', 'latitude', 'longitude', 'lat', 'lng', 'lon'].includes(k)) {
            const isNumericField = records.some((r) => typeof r[k] === 'number');
            if (isNumericField) {
              parameters.push(k);
            }
          }
        });

        // Determine Date Range
        let startDate = null;
        let endDate = null;
        if (firstRowKeys.includes('date')) {
          const validDates = records
            .map((r) => r.date ? new Date(r.date) : null)
            .filter((d) => d && !isNaN(d.getTime()))
            .sort((a, b) => a - b);
          
          if (validDates.length > 0) {
            startDate = validDates[0];
            endDate = validDates[validDates.length - 1];
          }
        }

        resolve({
          columns,
          parameters,
          rowCount: records.length,
          columnCount: columns.length,
          missingValueCount,
          dateRange: { start: startDate, end: endDate },
          hasCoordinates,
          records,
        });
      })
      .on('error', (err) => {
        reject(new Error(`Failed to parse CSV file: ${err.message}`));
      });
  });
};
