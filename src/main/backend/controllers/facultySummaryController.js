import * as facultySumm_model from '../models/facultySumm_model.js';

// Log the underlying DB/driver error so 500s aren't silent in the journal.
// `context` identifies the failing handler; pg errors carry code/detail.
const logDbError = (context, error) => {
  console.error(
    `${context}:`, error.message,
    error.code ? `(code ${error.code})` : '', error.detail || ''
  );
};

const getAllbyID = async (req, res) => {
  const facultyId = req.params.id;
  try {
    const summaryData = await facultySumm_model.getSummaryByFacultyId(facultyId);
    const keywordsData = await facultySumm_model.getKeywordsByFacultyId(facultyId);
    const broadKeywordsData = await facultySumm_model.getBroadKeywordsByFacultyId(facultyId);

    if (!summaryData && !keywordsData && !broadKeywordsData) {
      return res.status(404).json({ error: 'Faculty summary, keywords, and broad keywords not found' });
    }  

    res.json({
      summary: summaryData,
      keywords: keywordsData,
      broad_keywords: broadKeywordsData
    });
  } catch (error) {
    logDbError(`Failed to fetch faculty information ${facultyId}`, error);
    res.status(500).json({ error: 'Failed to fetch faculty information' });
  }
};

const getSummarybyID = async (req, res) => {
  const facultyId = req.params.id;
  try {
    const summaryData = await facultySumm_model.getSummaryByFacultyId(facultyId);
    if (!summaryData) {
      return res.status(404).json({ error: 'Faculty summary not found' });
    }
    res.json(summaryData);
  } catch (error) {
    logDbError(`Failed to fetch faculty summary ${facultyId}`, error);
    res.status(500).json({ error: 'Failed to fetch faculty summary' });
  }
};

const getKeywordsbyID = async (req, res) => {
  const facultyId = req.params.id;
  try {
    const keywordsData = await facultySumm_model.getKeywordsByFacultyId(facultyId);
    if (!keywordsData) {
      return res.status(404).json({ error: 'Faculty keywords not found' });
    }
    res.json(keywordsData);
  } catch (error) {
    logDbError(`Failed to fetch faculty keywords ${facultyId}`, error);
    res.status(500).json({ error: 'Failed to fetch faculty keywords' });
  }
};

const getBroadKeywordsbyID = async (req, res) => {
  const facultyId = req.params.id;
  try {
    const broadKeywordsData = await facultySumm_model.getBroadKeywordsByFacultyId(facultyId);
    if (!broadKeywordsData) {
      return res.status(404).json({ error: 'Faculty broad keywords not found' });
    }
    res.json(broadKeywordsData);
  } catch (error) {
    logDbError(`Failed to fetch faculty broad keywords ${facultyId}`, error);
    res.status(500).json({ error: 'Failed to fetch faculty broad keywords' });
  }
}

const getBroadKeywordsbyDept = async (req, res) => {
  const { department } = req.query;
  try {
    const broadKeywordsData = await facultySumm_model.getBroadKeywordsbyDept(department);
    if (!broadKeywordsData) {
      return res.status(404).json({ error: 'Faculty broad keywords not found for this department' });
    }
    res.json(broadKeywordsData);
  } catch (error) {
    logDbError('Failed to fetch faculty broad keywords by department', error);
    res.status(500).json({ error: 'Failed to fetch faculty broad keywords by department' });
  }
}
const getIdbyKeyword = async (req, res) => {
  const { keyword } = req.query;
  try {
    const facultyIds = await facultySumm_model.getIdbyKeyword(keyword);
    if (!facultyIds || facultyIds.length === 0) {
      return res.status(404).json({ error: 'No faculty members found for this keyword' });
    }
    res.json(facultyIds);
  } catch (error) {
    logDbError('Failed to fetch faculty IDs by keyword', error);
    res.status(500).json({ error: 'Failed to fetch faculty IDs by keyword' });
  }
}

// Accepts arrays or comma-separated strings; returns a clean string[] (or undefined
// if the field wasn't provided, so it stays untouched downstream).
const toKeywordArray = (v) => {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// Update the AI-generated content. Auth + ownership enforced by middleware.
const update = async (req, res) => {
  const facultyId = req.params.id;
  const { summary, keywords, broad_keywords } = req.body;

  const fields = {};
  if (summary !== undefined) fields.summary = summary;
  if (keywords !== undefined) fields.keywords = toKeywordArray(keywords);
  if (broad_keywords !== undefined) fields.broad_keywords = toKeywordArray(broad_keywords);

  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  try {
    const updated = await facultySumm_model.updateSummaryFields(facultyId, fields);
    res.json(updated);
  } catch (error) {
    logDbError(`Failed to update summary for faculty ${facultyId}`, error);
    res.status(500).json({ error: 'Failed to update faculty summary' });
  }
};

// Hand the blurb back to AI: clear owner_edited so the next generation run can
// refresh it. Auth + ownership enforced by middleware. The text is unchanged
// until that run; only the "managed by" flag flips.
const resetToAI = async (req, res) => {
  const facultyId = req.params.id;
  try {
    const updated = await facultySumm_model.clearOwnerEdited(facultyId);
    if (!updated) {
      return res.status(404).json({ error: 'No summary to reset' });
    }
    res.json(updated);
  } catch (error) {
    logDbError(`Failed to reset summary for faculty ${facultyId}`, error);
    res.status(500).json({ error: 'Failed to reset faculty summary' });
  }
};

export default{
    getAllbyID,
    getSummarybyID,
    getKeywordsbyID,
    getBroadKeywordsbyID,
    getBroadKeywordsbyDept,
    getIdbyKeyword,
    update,
    resetToAI
}