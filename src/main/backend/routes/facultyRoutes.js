import express from 'express';
import facultyController from '../controllers/facultyController.js';
const router = express.Router();

// database queries

router.get('/', facultyController.getAll);
router.get('/:id', facultyController.getById);
router.get('/name', facultyController.getByName);
router.get('/department', facultyController.getByDepartment);
router.get('/topic', facultyController.getByTopic);
router.get('/dept-topic', facultyController.getAllbyDeptTopic);

export default router;



