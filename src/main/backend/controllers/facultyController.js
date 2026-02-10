import * as faculty_model from '../models/faculty_model.js';

const getAll = async (req, res) => {
  try {
    const facultyMembers = await faculty_model.getAll();
    res.json(facultyMembers);
  } catch (error) {
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
    
    // Ensure research_areas is always an array
    if (facultyMember.research_areas) {
      if (typeof facultyMember.research_areas === 'string') {
        // Check if it's PostgreSQL array format: {value1,value2}
        if (facultyMember.research_areas.startsWith('{') && facultyMember.research_areas.endsWith('}')) {
          // Parse PostgreSQL array format
          const arrayContent = facultyMember.research_areas.slice(1, -1); // Remove { and }
          facultyMember.research_areas = arrayContent
            .split(',')
            .map(area => {
              // Remove all quotes (both single and double, from start and end)
              let cleaned = area.trim();
              // Remove surrounding quotes
              cleaned = cleaned.replace(/^["']|["']$/g, '');
              return cleaned;
            })
            .filter(area => area.length > 0);
        } else {
          // Try to parse as JSON first
          try {
            const parsed = JSON.parse(facultyMember.research_areas);
            facultyMember.research_areas = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            // If not JSON, try splitting by comma
            facultyMember.research_areas = facultyMember.research_areas
              .split(',')
              .map(area => area.trim())
              .filter(area => area.length > 0);
          }
        }
      } else if (!Array.isArray(facultyMember.research_areas)) {
        // If it's not a string and not an array, make it an empty array
        facultyMember.research_areas = [];
      }
    } else {
      facultyMember.research_areas = [];
    }
    
    // Log research_areas format for debugging
    console.log(`[GET] Faculty ID ${id} - research_areas type:`, typeof facultyMember.research_areas, 'value:', facultyMember.research_areas);
    res.json(facultyMember);
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to fetch faculty members by name' });
  }
};

 const getDepartments = async (req, res) => {
  try {
    const departments = await faculty_model.getDepartments();
    res.json(departments);
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to fetch faculty members by department and topic' });
  }
};

// Update faculty by ID
const updateById = async (req, res) => {
  const id = parseInt(req.params.id);
  console.log(`[UPDATE] Received PUT request for faculty ID: ${id}`);
  console.log(`[UPDATE] Request headers:`, req.headers);
  console.log(`[UPDATE] Request body:`, req.body);
  
  try {
    // Validate that faculty exists
    const existingFaculty = await faculty_model.getById(id);
    console.log(`[UPDATE] Faculty lookup result:`, existingFaculty ? `Found: ${existingFaculty.name}` : 'Not found');
    if (!existingFaculty) {
      return res.status(404).json({ error: 'Faculty member not found' });
    }

    // Verify authorization: user email must match faculty email
    const userEmail = req.headers['x-user-email'];
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized: User email not provided' });
    }

    // Allow brian_kim@ucsb.edu to edit any profile for testing (works in both local and production)
    const isTestEmail = userEmail.toLowerCase() === 'brian_kim@ucsb.edu';
    const emailMatches = existingFaculty.email && 
        existingFaculty.email.toLowerCase() === userEmail.toLowerCase();

    if (!isTestEmail && !emailMatches) {
      return res.status(403).json({ 
        error: 'Unauthorized: Email does not match faculty member email' 
      });
    }

    // Extract allowed fields from request body
    const updates = {
      specialization: req.body.specialization,
      research_areas: req.body.research_areas,
      phone: req.body.phone,
      office: req.body.office,
      website: req.body.website,
      email: req.body.email,
      profile_url: req.body.profile_url,
    };

    // Remove undefined fields
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Update faculty
    const updatedFaculty = await faculty_model.updateFaculty(id, updates);
    console.log(`[UPDATE] Successfully updated faculty ID ${id}:`, {
      name: updatedFaculty.name,
      specialization: updatedFaculty.specialization,
      research_areas: updatedFaculty.research_areas,
      website: updatedFaculty.website,
      phone: updatedFaculty.phone,
      office: updatedFaculty.office,
    });
    res.json(updatedFaculty);
  } catch (error) {
    console.error('Update faculty error:', error);
    res.status(500).json({ 
      error: 'Failed to update faculty member',
      message: error.message 
    });
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
  updateById
};
