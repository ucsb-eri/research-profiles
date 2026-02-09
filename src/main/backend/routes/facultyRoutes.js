import express from 'express';
import facultyController from '../controllers/facultyController.js';
const router = express.Router();

// database queries

router.get('/', facultyController.getAll);



router.get('/name', facultyController.getByName);
router.get('/alldepartments', facultyController.getDepartments);
router.get('/department', facultyController.getByDepartment);
router.get('/topic', facultyController.getByTopic);
router.get('/dept-topic', facultyController.getAllbyDeptTopic);


//moved to bott otherwise it captures all
router.get('/:id', facultyController.getById);

// Update faculty by ID (PUT request)
router.put('/:id', (req, res, next) => {
  console.log(`[ROUTE] PUT /api/faculty/${req.params.id} matched`);
  next();
}, facultyController.updateById);

export default router;



