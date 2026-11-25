import Student from '../models/Student.js';
import User from '../models/User.js';
import db from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getProfile = async (req, res) => {
  try {
    const profile = await Student.getProfile(req.user.id);
    
    // Add portfolio data to the profile
    if (profile) {
      profile.portfolio = {
        education: await Student.getEducation(req.user.id),
        skills: await Student.getSkills(req.user.id),
        projects: await Student.getProjects(req.user.id)
      };
    }
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const updated = await Student.updateProfile(req.user.id, req.body);
    if (updated) {
      res.json({ message: 'Profile updated successfully' });
    } else {
      res.status(400).json({ message: 'Update failed' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePortfolio = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, university, education, skills, projects } = req.body;

    // Update user name if provided
    if (name) {
      await User.update(userId, { name });
    }

    // Update profile information if provided
    if (phone || university) {
      await Student.updateProfile(userId, { phone, university });
    }

    // Handle education updates
    if (education && Array.isArray(education)) {
      // First, get existing education entries
      const existingEducation = await Student.getEducation(userId);
      
      // Delete all existing education entries
      for (const edu of existingEducation) {
        await Student.deleteEducation(userId, edu.id);
      }
      
      // Add new education entries
      for (const edu of education) {
        await Student.addEducation(userId, edu);
      }
    }

    // Handle skills updates
    if (skills && Array.isArray(skills)) {
      // First, get existing skills
      const existingSkills = await Student.getSkills(userId);
      
      // Delete all existing skills
      // Note: This is a simplified approach. In a production app, you'd want to implement proper diffing logic
      const skillRows = await db.execute(
        'SELECT id FROM portfolio_skills WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
        [userId]
      );
      for (const skillRow of skillRows[0]) {
        await Student.deleteSkill(userId, skillRow.id);
      }
      
      // Add new skills
      for (const skill of skills) {
        await Student.addSkill(userId, skill);
      }
    }

    // Handle projects updates
    if (projects && Array.isArray(projects)) {
      // First, get existing projects
      const existingProjects = await Student.getProjects(userId);
      
      // Delete all existing projects
      for (const project of existingProjects) {
        await Student.deleteProject(userId, project.id);
      }
      
      // Add new projects
      for (const project of projects) {
        await Student.addProject(userId, project);
      }
    }

    res.json({ message: 'Portfolio updated successfully' });
  } catch (error) {
    console.error('Update Portfolio Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadResume = async (req, res) => {
  let uploadPath;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    if (!req.file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) {
      return res.status(400).json({ message: 'Uploaded file is not a valid PDF' });
    }

    const fileName = `resume_${req.user.id}_${Date.now()}.pdf`;
    const uploadsDir = path.resolve(__dirname, '../../uploads/resumes');
    uploadPath = path.join(uploadsDir, fileName);

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(uploadPath, req.file.buffer, { flag: 'wx' });

    const updated = await Student.updateResume(req.user.id, fileName);
    if (!updated) {
      await fs.unlink(uploadPath);
      return res.status(500).json({ message: 'Failed to update resume in database' });
    }

    res.json({ message: 'Resume uploaded successfully', fileName });
  } catch (error) {
    if (uploadPath) {
      await fs.unlink(uploadPath).catch(() => {});
    }
    console.error('Upload Resume Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getResume = async (req, res) => {
  try {
    const { fileName } = req.params;
    if (!/^resume_\d+_\d+\.pdf$/i.test(fileName || '')) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const [resumeRows] = await db.execute(
      'SELECT id, user_id FROM student_profiles WHERE resume = ? LIMIT 1',
      [fileName]
    );
    if (resumeRows.length === 0) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const resumeOwner = resumeRows[0];
    let hasAccess = req.user.role === 'admin' ||
      (req.user.role === 'student' && String(req.user.id) === String(resumeOwner.user_id));

    if (req.user.role === 'company') {
      const [applicationRows] = await db.execute(`
        SELECT 1
        FROM applications a
        JOIN internships i ON a.internship_id = i.id
        JOIN company_profiles cp ON cp.id = i.company_id
        WHERE a.student_id = ? AND cp.user_id = ?
        LIMIT 1
      `, [resumeOwner.id, req.user.id]);
      hasAccess = applicationRows.length > 0;
    }

    if (req.user.role === 'privileged_admin') {
      hasAccess = await User.hasPrivilege(req.user.id, 'manage_students');
    }

    if (!hasAccess) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    const resumePath = path.resolve(__dirname, '../../uploads/resumes', fileName);
    await fs.access(resumePath);
    res.type('application/pdf');
    res.set('Cache-Control', 'private, no-store');
    res.set('Content-Disposition', 'inline; filename="resume.pdf"');
    res.sendFile(resumePath, error => {
      if (error && !res.headersSent) {
        res.status(error.statusCode || 500).json({ message: 'Failed to retrieve resume' });
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'Resume not found' });
    }
    console.error('Get Resume Error:', error);
    res.status(500).json({ message: 'Failed to retrieve resume' });
  }
};

export const getUserPrivileges = async (req, res) => {
  try {
    // Get user privileges from the User model
    const privileges = await User.getPrivileges(req.user.id);
    
    res.json({
      success: true,
      privileges
    });
  } catch (error) {
    console.error('Get User Privileges Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user privileges'
    });
  }
};


export const getEducation = async (req, res) => {
  try {
    res.json(await Student.getEducation(req.user.id));
  } catch (error) {
    console.error('Get Education Error:', error);
    res.status(500).json({ message: 'Failed to fetch education' });
  }
};

export const addEducation = async (req, res) => {
  const { institution, degree, start_date, end_date } = req.body || {};
  const validMonth = value =>
    value === undefined || value === null || value === '' ||
    (typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
  if (typeof institution !== 'string' || !institution.trim() ||
      institution.trim().length > 200 ||
      typeof degree !== 'string' || !degree.trim() ||
      degree.trim().length > 200 ||
      !validMonth(start_date) || !validMonth(end_date)) {
    return res.status(400).json({ message: 'Institution, degree, and valid month dates are required' });
  }

  try {
    const id = await Student.addEducation(req.user.id, {
      institution: institution.trim(),
      degree: degree.trim(),
      start_date,
      end_date
    });
    res.status(201).json({ id });
  } catch (error) {
    console.error('Add Education Error:', error);
    res.status(500).json({ message: 'Failed to add education' });
  }
};

export const getSkills = async (req, res) => {
  try {
    res.json(await Student.getSkills(req.user.id));
  } catch (error) {
    console.error('Get Skills Error:', error);
    res.status(500).json({ message: 'Failed to fetch skills' });
  }
};

export const addSkill = async (req, res) => {
  const skill = typeof req.body?.skill === 'string' ? req.body.skill.trim() : '';
  if (!skill || skill.length > 150) {
    return res.status(400).json({ message: 'Skill is required' });
  }

  try {
    const id = await Student.addSkill(req.user.id, skill);
    res.status(201).json({ id, skill });
  } catch (error) {
    console.error('Add Skill Error:', error);
    res.status(500).json({ message: 'Failed to add skill' });
  }
};

export const getProjects = async (req, res) => {
  try {
    res.json(await Student.getProjects(req.user.id));
  } catch (error) {
    console.error('Get Projects Error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

export const addProject = async (req, res) => {
  const { title, description } = req.body || {};
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) {
    return res.status(400).json({ message: 'Project title is required' });
  }

  try {
    const id = await Student.addProject(req.user.id, {
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : null
    });
    res.status(201).json({ id });
  } catch (error) {
    console.error('Add Project Error:', error);
    res.status(500).json({ message: 'Failed to add project' });
  }
};

export const getApplications = async (req, res) => {
  try {
    const applications = await Student.getAppliedInternships(req.user.id);
    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
