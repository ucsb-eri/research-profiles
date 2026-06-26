import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Local storage for user-uploaded faculty photos. Files live on disk and are
// served statically (see app.js); faculty.photo_url is set to the public URL.
//
// Override the storage location with UPLOAD_DIR (absolute path) — useful in
// production to point at a mounted volume that survives redeploys. By default
// it sits at <backend>/uploads, which is gitignored.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '..'); // .../src/main/backend

export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(BACKEND_ROOT, 'uploads');

// Photos get their own subfolder so other upload types can be added later.
export const PHOTO_DIR = path.join(UPLOAD_ROOT, 'faculty-photos');

// Public URL paths (mounted by express.static in app.js). PHOTO_URL_PATH is also
// used to recognize our own URLs when cleaning up replaced files.
export const UPLOAD_URL_PATH = '/uploads';
export const PHOTO_URL_PATH = '/uploads/faculty-photos';

// Ensure the photos directory exists before any write. Recursive create is a
// no-op if it's already there, so this is safe to run at import time.
fs.mkdirSync(PHOTO_DIR, { recursive: true });
