import multer from 'multer';
import { PHOTO_DIR } from '../config/uploads.js';

// Multer config for faculty profile-photo uploads. Stores to disk under
// PHOTO_DIR (see config/uploads.js). Run AFTER requireUcsbAuth +
// requireProfileOwnerOrAdmin so the file is only written for an authorized
// caller, and req.params.id is a validated numeric id by the time we name it.

// Accepted image types -> file extension. Anything else is rejected before the
// file touches disk (fileFilter), so we never store, say, an uploaded script.
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PHOTO_DIR),
  filename: (req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] || 'img';
    // Timestamp makes the name unique per upload and doubles as a cache-buster,
    // so a replaced photo isn't served stale from a CDN/browser cache.
    cb(null, `faculty-${req.params.id}-${Date.now()}.${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (MIME_EXT[file.mimetype]) cb(null, true);
  else cb(new Error('UNSUPPORTED_TYPE'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_BYTES } });

// Wrap upload.single('photo') so multer/file-validation errors come back as
// clean JSON 400s instead of Express's default HTML error page.
export function uploadFacultyPhoto(req, res, next) {
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image must be 5MB or smaller' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err.message === 'UNSUPPORTED_TYPE') {
      return res.status(400).json({ error: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.' });
    }
    return res.status(400).json({ error: 'Failed to process upload' });
  });
}
