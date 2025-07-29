import * as facultyLinks_model from '../models/facultyLinks_model.js';

const getAllLinks = async (req, res) => {
  try {
    const facultyLinks = await facultyLinks_model.getAllResearchLinks();
    res.json(facultyLinks);
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to fetch faculty research links' });
  }
};

export default {
    getAllLinks,
    getLinksByFacultyId
};
