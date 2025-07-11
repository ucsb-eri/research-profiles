import faculty_model from '../models/faculty_model.js';

exports.getAll = async (req, res) => {
  try {
    const facultyMembers = await faculty_model.getAll();
    res.json(facultyMembers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch faculty members' });
  }
}

exports.getById = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const facultyMember = await faculty_model.getById(id);
    if (!facultyMember) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }
    res.json(facultyMember);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch faculty member' });
  }
}

exports.getByName = async (req, res) => {
    const { query } = req.query;
    try {
        const facultyMembers = await faculty_model.getByName(query);
        if (facultyMembers.length === 0) {
        return res.status(404).json({ error: 'Faculty member not found' });
        }
        res.json(facultyMembers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch faculty members by name' });
    }
    }

exports.getByDepartment = async (req, res) => {
    const { department } = req.query;
    try {
        const facultyMembers = await faculty_model.getByDepartment(department);
        if (facultyMembers.length === 0) {
        return res.status(404).json({ error: 'No faculty members found for this department' });
        }
        res.json(facultyMembers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch faculty members by department' });
    }
    }

exports.getByTopic = async (req, res) => {
    const { topic } = req.query;
    try {
        const facultyMembers = await faculty_model.getByTopic(topic);
        if (facultyMembers.length === 0) {
        return res.status(404).json({ error: 'No faculty members found for this topic' });
        }
        res.json(facultyMembers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch faculty members by topic' });
    }
    }
exports.getAllbyDeptTopic = async (req, res) => {
  const { department, topic } = req.query;
  try {
    const facultyMembers = await faculty_model.getAllbyDeptTopic(department, topic);
    if (facultyMembers.length === 0) {
      return res.status(404).json({ error: 'No faculty members found for this criteria' });
    }
    res.json(facultyMembers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch faculty members by department and topic' });
  }
}