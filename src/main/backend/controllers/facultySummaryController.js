import * as facultySumm_model from '../models/facultySumm_model.js';

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
    res.status(500).json({ error: 'Failed to fetch faculty broad keywords' });
  }
}
export default{
    getSummarybyID,
    getKeywordsbyID,
    getBroadKeywordsbyID
}