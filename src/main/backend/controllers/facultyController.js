import * as faculty_model from '../models/faculty_model.js';

// Log the underlying DB/driver error so 500s aren't silent in the journal.
// `context` identifies the failing handler; pg errors carry code/detail.
const logDbError = (context, error) => {
  console.error(
    `${context}:`, error.message,
    error.code ? `(code ${error.code})` : '', error.detail || ''
  );
};

const getAll = async (req, res) => {
  try {
    const facultyMembers = await faculty_model.getAll();
    res.json(facultyMembers);
  } catch (error) {
    logDbError('Failed to fetch faculty members', error);
    res.status(500).json({ error: 'Failed to fetch faculty members' });
  }
};

const getById = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const facultyMember = await faculty_model.getById(id);
    if (!facultyMember) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }
    res.json(facultyMember);
  } catch (error) {
    logDbError(`Failed to fetch faculty member ${id}`, error);
    res.status(500).json({ error: 'Failed to fetch faculty member' });
  }
};

const getByName = async (req, res) => {
  const { name } = req.query;
  try {
    const facultyMembers = await faculty_model.getByName(name);
    if (facultyMembers.length === 0) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }
    res.json(facultyMembers);
  } catch (error) {
    logDbError('Failed to fetch faculty members by name', error);
    res.status(500).json({ error: 'Failed to fetch faculty members by name' });
  }
};

 const getDepartments = async (req, res) => {
  try {
    const departments = await faculty_model.getDepartments();
    res.json(departments);
  } catch (error) {
    logDbError('Failed to fetch departments', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

const getByDepartment = async (req, res) => {
  const { department } = req.query;
  try {
    const facultyMembers = await faculty_model.getByDepartment(department);
    if (facultyMembers.length === 0) {
      return res.status(404).json({ error: 'No faculty members found for this department' });
    }
    res.json(facultyMembers);
  } catch (error) {
    logDbError('Failed to fetch faculty members by department', error);
    res.status(500).json({ error: 'Failed to fetch faculty members by department' });
  }
};

const getByTopic = async (req, res) => {
  const { topic } = req.query;
  try {
    const facultyMembers = await faculty_model.getByTopic(topic);
    if (facultyMembers.length === 0) {
      return res.status(404).json({ error: 'No faculty members found for this topic' });
    }
    res.json(facultyMembers);
  } catch (error) {
    logDbError('Failed to fetch faculty members by topic', error);
    res.status(500).json({ error: 'Failed to fetch faculty members by topic' });
  }
};

const getAllbyDeptTopic = async (req, res) => {
  const { department, topic } = req.query;
  try {
    const facultyMembers = await faculty_model.getAllbyDeptTopic(department, topic);
    if (facultyMembers.length === 0) {
      return res.status(404).json({ error: 'No faculty members found for this criteria' });
    }
    res.json(facultyMembers);
  } catch (error) {
    logDbError('Failed to fetch faculty members by department and topic', error);
    res.status(500).json({ error: 'Failed to fetch faculty members by department and topic' });
  }
};

const search = async (req, res) => {
  const { q, limit, offset } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Missing required query param: q' });
  }
  try {
    const results = await faculty_model.searchFaculty(q.trim(), {
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0,
    });
    res.json(results); // [] when nothing matches
  } catch (error) {
    logDbError('Failed to search faculty', error);
    res.status(500).json({ error: 'Failed to search faculty' });
  }
};

// Update profile fields. Auth + ownership are enforced by middleware before this runs.
const update = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const updated = await faculty_model.updateFaculty(id, req.body);
    if (!updated) {
      return res.status(400).json({ error: 'No editable fields provided' });
    }
    res.json(updated);
  } catch (error) {
    logDbError(`Failed to update faculty ${id}`, error);
    res.status(500).json({ error: 'Failed to update faculty member' });
  }
};

export default {
  getAll,
  getById,
  getByName,
  getDepartments,
  getByDepartment,
  getByTopic,
  getAllbyDeptTopic,
  search,
  update
};
