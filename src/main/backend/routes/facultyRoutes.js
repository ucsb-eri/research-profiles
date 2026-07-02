import express from 'express';
import facultyController from '../controllers/facultyController.js';
import { requireUcsbAuth, requireProfileOwnerOrAdmin } from '../middleware/auth.js';
import { uploadFacultyPhoto } from '../middleware/photoUpload.js';
const router = express.Router();

// database queries

router.get('/', facultyController.getAll);



router.get('/search', facultyController.search);
router.get('/name', facultyController.getByName);
router.get('/alldepartments', facultyController.getDepartments);
router.get('/alldivisions', facultyController.getDivisions);
router.get('/division', facultyController.getByDivision);
router.get('/department', facultyController.getByDepartment);


//moved to bott otherwise it captures all
router.get('/:id', facultyController.getById);

// Profile edit — allowed for the owner or a site admin (enforced by middleware)
router.put('/:id', requireUcsbAuth, requireProfileOwnerOrAdmin, facultyController.update);

// Profile image upload (multipart, field name: photo). Same owner-or-admin gate;
// the file is validated + written by uploadFacultyPhoto before the handler runs.
router.put('/:id/photo', requireUcsbAuth, requireProfileOwnerOrAdmin, uploadFacultyPhoto, facultyController.uploadPhoto);

export default router;



