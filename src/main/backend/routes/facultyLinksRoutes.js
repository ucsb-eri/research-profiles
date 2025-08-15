import express from 'express';
import facultyLinksController from '../controllers/facultyLinksController.js';

const router = express.Router();

router.get('/', facultyLinksController.getAllLinks);
router.get('/:id', facultyLinksController.getLinksByFacultyId);

export default router;
