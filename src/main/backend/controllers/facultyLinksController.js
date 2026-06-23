import * as facultyLinks_model from '../models/facultyLinks_model.js';

// Log the underlying DB/driver error so 500s aren't silent in the journal.
// `context` identifies the failing handler; pg errors carry code/detail.
const logDbError = (context, error) => {
  console.error(
    `${context}:`, error.message,
    error.code ? `(code ${error.code})` : '', error.detail || ''
  );
};

const getAllLinks = async (req, res) => {
  try {
    const facultyLinks = await facultyLinks_model.getAllResearchLinks();
    res.json(facultyLinks);
  } catch (error) {
    logDbError('Failed to fetch faculty research links', error);
    res.status(500).json({ error: 'Failed to fetch faculty research links' });
  }
};

const getLinksByFacultyId = async (req, res) => {
  const facultyId = req.params.id;
  try {
    const facultyLinks = await facultyLinks_model.getFacultyResearchLinksById(facultyId);
    if (!facultyLinks) {
      return res.status(404).json({ error: 'Faculty research links not found' });
    }
    res.json(facultyLinks);
  } catch (error) {
    logDbError(`Failed to fetch faculty research links ${facultyId}`, error);
    res.status(500).json({ error: 'Failed to fetch faculty research links' });
  }
};

export default {
    getAllLinks,
    getLinksByFacultyId
};
