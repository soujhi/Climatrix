import path from 'path';
import multer from 'multer';

/**
 * MULTER FILE UPLOAD MIDDLEWARE
 * Handles single CSV file uploads, validates file extension and size (10MB max).
 */
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

function checkFileType(file, cb) {
  const filetypes = /csv/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || file.mimetype === 'text/plain';

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('CSV Files Only! Please upload a valid .csv dataset file.'));
  }
}

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});
