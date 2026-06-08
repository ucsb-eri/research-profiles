import express from 'express';
import facultyController from '../controllers/facultyController.js';
import { requireUcsbAuth, requireProfileOwner } from '../middleware/auth.js';
const router = express.Router();

// database queries

router.get('/', facultyController.getAll);



router.get('/search', facultyController.search);
router.get('/name', facultyController.getByName);
router.get('/alldepartments', facultyController.getDepartments);
router.get('/department', facultyController.getByDepartment);
router.get('/topic', facultyController.getByTopic);
router.get('/dept-topic', facultyController.getAllbyDeptTopic);


//moved to bott otherwise it captures all
router.get('/:id', facultyController.getById);

// Owner-only profile edit (auth + ownership enforced by middleware)
router.put('/:id', requireUcsbAuth, requireProfileOwner, facultyController.update);

export default router;



