import express from 'express';
import facultyController from '../controllers/facultyController.js';
import { requireUcsbAuth, requireProfileOwnerOrAdmin } from '../middleware/auth.js';
const router = express.Router();

// database queries

router.get('/', facultyController.getAll);



router.get('/search', facultyController.search);
router.get('/name', facultyController.getByName);
router.get('/alldepartments', facultyController.getDepartments);
router.get('/alldivisions', facultyController.getDivisions);
router.get('/division', facultyController.getByDivision);
router.get('/department', facultyController.getByDepartment);
router.get('/topic', facultyController.getByTopic);
router.get('/dept-topic', facultyController.getAllbyDeptTopic);


//moved to bott otherwise it captures all
router.get('/:id', facultyController.getById);

// Profile edit — allowed for the owner or a site admin (enforced by middleware)
router.put('/:id', requireUcsbAuth, requireProfileOwnerOrAdmin, facultyController.update);

export default router;



