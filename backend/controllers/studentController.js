import Student from '../models/Student.js';
import User from '../models/User.js';
import db from '../config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
  try {
    // Check if we have file data
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Generate a unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `resume_${req.user.id}_${Date.now()}.${fileExtension}`;
    
    // Define upload path
    const uploadPath = path.join(__dirname, 'uploads', fileName);
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Write file to disk
    fs.writeFile(uploadPath, req.file.buffer, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(500).json({ message: 'File upload failed' });
      }
      
      // Update the resume path in the database
      const updated = await Student.updateResume(req.user.id, fileName);
      
      if (updated) {
        res.json({
          message: 'Resume uploaded successfully',
          fileName: fileName
        });
      } else {
        res.status(500).json({ message: 'Failed to update resume in database' });
      }
    });
  } catch (error) {
    console.error('Upload Resume Error:', error);
    res.status(500).json({ message: 'Server error' });
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
  // Implementation
};

export const addEducation = async (req, res) => { 
  // Implementation
};

export const getSkills = async (req, res) => { 
  // Implementation
};

export const addSkill = async (req, res) => { 
  // Implementation
};

export const getProjects = async (req, res) => { 
  // Implementation
};

export const addProject = async (req, res) => { 
  // Implementation
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