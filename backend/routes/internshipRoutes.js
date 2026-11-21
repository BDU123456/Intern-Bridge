import express from 'express';
import db from '../config/db.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import Application from '../models/Application.js';
import { sendApplicationNotificationToCompany } from '../utils/emailService.js';
import { sendApplicationDetailsToCompany } from '../utils/paymentEmailService.js';

const router = express.Router();

// Get all internships (public endpoint)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT i.*, u.name as company_name, u.email as company_email 
      FROM internships i 
      JOIN company_profiles cp ON i.company_id = cp.id 
      JOIN users u ON cp.user_id = u.id 
      WHERE i.status = 'active'
      ORDER BY i.id DESC
    `);
    
    res.json({
      success: true,
      internships: rows
    });
  } catch (error) {
    console.error('Get all internships error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch internships' 
    });
  }
});

// Get company names for students (public endpoint)
router.get('/companies', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT DISTINCT u.name 
      FROM users u 
      JOIN company_profiles cp ON u.id = cp.user_id 
      WHERE u.role = 'company'
      ORDER BY u.name
    `);
    
    res.json({
      success: true,
      companies: rows
    });
  } catch (error) {
    console.error('Get company names error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch company names' 
    });
  }
});

// Apply for an internship (student only)
router.post('/:id/apply', authMiddleware(['student']), async (req, res) => {
  try {
    const internshipId = req.params.id;
    const userId = req.user.id;
    
    // Get student profile ID from student_profiles table
    const [studentProfileRows] = await db.execute(
      'SELECT id FROM student_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (studentProfileRows.length === 0) {
      return res.status(400).json({ message: 'Student profile not found. Please complete your profile.' });
    }
    
    const studentId = studentProfileRows[0].id;
    
    // Check if internship exists
    const [internshipRows] = await db.execute(
      'SELECT id FROM internships WHERE id = ?',
      [internshipId]
    );
    
    if (internshipRows.length === 0) {
      return res.status(404).json({ message: 'Internship not found' });
    }
    
    // Check if student has already applied
    const [existingApplications] = await db.execute(
      'SELECT id FROM applications WHERE internship_id = ? AND student_id = ?',
      [internshipId, studentId]
    );
    
    if (existingApplications.length > 0) {
      return res.status(400).json({ message: 'You have already applied for this internship' });
    }
    
    // Get student name and email
    const [studentUserRows] = await db.execute(
      'SELECT name, email FROM users WHERE id = ?',
      [userId]
    );
    const studentName = studentUserRows[0].name;
    const studentEmail = studentUserRows[0].email;

    // Get student phone
    const [phoneRows] = await db.execute(
      'SELECT phone FROM student_profiles WHERE user_id = ?',
      [userId]
    );
    const studentPhone = phoneRows.length ? phoneRows[0].phone : null;

    // Get internship details including company info
    const [internshipDetailsRows] = await db.execute(`
      SELECT i.title, u.email as companyEmail, u.name as companyName
      FROM internships i
      JOIN company_profiles c ON i.company_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE i.id = ?
    `, [internshipId]);
    
    const internshipTitle = internshipDetailsRows[0].title;
    const companyEmail = internshipDetailsRows[0].companyEmail;
    const companyName = internshipDetailsRows[0].companyName;

    // Create application
    const applicationId = await Application.create({
      internshipId,
      studentId
    });

    // Respond immediately; send emails in background to improve UX
    res.status(201).json({
      id: applicationId,
      message: 'Application submitted successfully'
    });

    // Fire-and-forget: email notification with application details to company
    setImmediate(async () => {
      console.log('Attempting to send application details to company:', {
        companyEmail,
        companyName,
        studentName,
        internshipTitle
      });
      try {
        // Fetch portfolio data
        const [educationRows] = await db.execute(
          'SELECT * FROM portfolio_education WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
          [userId]
        );
        const [skillsRows] = await db.execute(
          'SELECT skill FROM portfolio_skills WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
          [userId]
        );
        const [projectsRows] = await db.execute(
          'SELECT title, description FROM portfolio_projects WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
          [userId]
        );

        await sendApplicationDetailsToCompany({
          companyEmail,
          companyName,
          internshipTitle,
          studentName,
          studentEmail,
          studentPhone,
          education: educationRows,
          skills: skillsRows.map(s => s.skill),
          projects: projectsRows,
          resume: null // if you store resume filename in student_profiles.resume you can add it
        });
      } catch (emailError) {
        console.error('Failed to send application details to company:', emailError);
      }
    });
  } catch (error) {
    console.error('Apply for internship error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;