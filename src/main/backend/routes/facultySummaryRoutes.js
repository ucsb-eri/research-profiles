import express from 'express';
import facultySummaryController from '../controllers/facultySummaryController.js';
import { requireUcsbAuth, requireProfileOwnerOrAdmin } from '../middleware/auth.js';
const router = express.Router();


// router.get('/:id/summary', facultySummaryController.getSummarybyID);
// router.get('/:id/keywords', facultySummaryController.getKeywordsbyID);
// router.get('/:id/broad_keywords', facultySummaryController.getBroadKeywordsbyID);
// router.get('/broad_keywords/department', facultySummaryController.getBroadKeywordsbyDept);  
// router.get('/keyword/getId', facultySummaryController.getIdbyKeyword);

// router.get('/:id', facultySummaryController.getAllbyID);

router.get('/id/:id/summary', facultySummaryController.getSummarybyID);
router.get('/id/:id/keywords', facultySummaryController.getKeywordsbyID);
router.get('/id/:id/broad_keywords', facultySummaryController.getBroadKeywordsbyID);
router.get('/broad_keywords/department', facultySummaryController.getBroadKeywordsbyDept);  
router.get('/keyword/:keyword/getId', facultySummaryController.getIdbyKeyword);
router.get('/id/:id', facultySummaryController.getAllbyID);

// Owner-or-admin edit of the AI-generated content (summary / keywords / broad_keywords)
router.put('/id/:id', requireUcsbAuth, requireProfileOwnerOrAdmin, facultySummaryController.update);

// Owner-or-admin: hand the blurb back to AI (clears the owner-edited flag).
router.put('/id/:id/reset-to-ai', requireUcsbAuth, requireProfileOwnerOrAdmin, facultySummaryController.resetToAI);

export default router;




