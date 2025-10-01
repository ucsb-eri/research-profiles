import express from 'express';
import facultySummaryController from '../controllers/facultySummaryController.js';
const router = express.Router();

router.get('/:id', facultySummaryController.getAllbyID);
router.get('/:id/summary', facultySummaryController.getSummarybyID);
router.get('/:id/keywords', facultySummaryController.getKeywordsbyID);
router.get('/:id/broad_keywords', facultySummaryController.getBroadKeywordsbyID);
router.get('/broad_keywords/department', facultySummaryController.getBroadKeywordsbyDept);

export default router;




