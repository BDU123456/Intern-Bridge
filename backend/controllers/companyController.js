import Company from '../models/Company.js';
import Internship from '../models/Internship.js';
import Application from '../models/Application.js';
import db from '../config/db.js';
import { sendApplicationStatusNotificationToStudent } from '../utils/emailService.js';
import { sendApplicationDetailsToCompany, sendPaymentRequestToStudent, sendPaymentReceivedNotificationToCompany } from '../utils/paymentEmailService.js';

export const getProfile = async (req, res) => {
  try {
    const profile = await Company.getProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Company: See only its own internships (with company name)
export const getInternships = async (req, res) => {
  try {
    // Get the company_profiles.id for the logged-in user
    const [[profile]] = await db.execute(
      'SELECT id FROM company_profiles WHERE user_id = ?',
      [req.user.id]
    );
    if (!profile) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const [rows] = await db.execute(`
      SELECT i.*, u.name AS companyName
      FROM internships i
      JOIN company_profiles c ON i.company_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE i.company_id = ? AND i.status = 'active'
    `, [profile.id]);
    res.json(rows);
  } catch (error) {
    console.error('Get Company Internships Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createInternship = async (req, res) => {
  try {
    // Get the company_profiles.id for the logged-in user
    const [[profile]] = await db.execute(
      'SELECT id FROM company_profiles WHERE user_id = ?',
      [req.user.id]
    );
    if (!profile) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const internshipData = {
      companyId: profile.id, // Use company_profiles.id!
      ...req.body
    };
    const internshipId = await Internship.create(internshipData);
    res.status(201).json({ id: internshipId });
  } catch (error) {
    console.error('Create Internship Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// For future: payment gating flags
const AWAITING_ADMIN_SEND_STATUS = 'awaiting_admin_payment_send';
const PAYMENT_REQUIRED_STATUS = 'awaiting_payment';
const PAYMENT_CONFIRMED_STATUS = 'payment_confirmed';

export const getApplicants = async (req, res) => {
  try {
    // Get the company_profiles.id for the logged-in user
    const [[profile]] = await db.execute(
      'SELECT id FROM company_profiles WHERE user_id = ?',
      [req.user.id]
    );
    if (!profile) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    const applicants = await Application.findByCompanyId(profile.id); // Use profile.id
    res.json(applicants);
  } catch (error) {
    console.error('Get Applicants Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, address, about } = req.body;
    const updated = await Company.updateProfile(req.user.id, { name, address, about });
    if (updated) {
      res.json({ message: 'Profile updated successfully' });
    } else {
      res.status(400).json({ message: 'Update failed' });
    }
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Accept a student's application
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
// Company marks they are ready to accept (triggers payment notification to student)
export const readyToAccept = async (req, res) => {
  try {
    const { applicationId } = req.params;
    // Load application details
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Send payment notification email to student
    try {
      await sendPaymentRequestToStudent({
        studentEmail: application.studentEmail,
        studentName: application.studentName,
        internshipTitle: application.internship_title,
        companyName: application.companyName,
        amount: '50 birr',
        paymentLink: null
      });
    } catch (e) {
      console.error('Failed to send payment notification to student:', e);
    }

    // Set status to awaiting_payment
    await Application.updateStatus(applicationId, PAYMENT_REQUIRED_STATUS);

    res.json({ message: 'Payment instructions sent to the student. Status set to awaiting_payment.' });
  } catch (error) {
    console.error('Ready To Accept Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const acceptApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    // Load application details
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Send payment notification email to student
    try {
      await sendPaymentRequestToStudent({
        studentEmail: application.studentEmail,
        studentName: application.studentName,
        internshipTitle: application.internship_title,
        companyName: application.companyName,
        amount: '50 birr',
        paymentLink: null
      });
    } catch (e) {
      console.error('Failed to send payment notification to student:', e);
      // continue regardless of email failure
    }

    // Set status to awaiting_payment
    const updated = await Application.updateStatus(applicationId, PAYMENT_REQUIRED_STATUS);
    if (!updated) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.json({ message: 'Payment instructions sent to the student. Waiting for admin approval.' });
  } catch (error) {
    console.error('Accept Application Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Reject a student's application
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    // Update application status to 'rejected'
    const updated = await Application.updateStatus(applicationId, 'rejected');
    
    if (!updated) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // Get application details for email notification
    const application = await Application.findById(applicationId);
    
    // Send email notification to student
    console.log('Attempting to send email notification to student for rejected application:', {
      studentEmail: application.studentEmail,
      studentName: application.studentName,
      internshipTitle: application.internship_title,
      companyName: application.companyName
    });
    
    try {
      const emailResult = await sendApplicationStatusNotificationToStudent(
        application.studentEmail,
        application.studentName,
        application.internship_title,
        'rejected',
        application.companyName
      );
      
      if (emailResult.success) {
        console.log('Email notification sent successfully to student for rejected application');
      } else {
        console.log('Email notification not sent to student:', emailResult.message || emailResult.error);
      }
    } catch (emailError) {
      console.error('Failed to send email notification to student:', emailError);
      // Don't fail the request if email sending fails
    }
    
    res.json({ message: 'Application rejected successfully' });
  } catch (error) {
    console.error('Reject Application Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Reject an internship posting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const rejectInternship = async (req, res) => {
  try {
    const { internshipId } = req.params;
    
    // Get the company_profiles.id for the logged-in user
    const [[profile]] = await db.execute(
      'SELECT id FROM company_profiles WHERE user_id = ?',
      [req.user.id]
    );
    
    if (!profile) {
      return res.status(400).json({ message: 'Company profile not found.' });
    }
    
    // Check if internship belongs to this company
    const internship = await Internship.findById(internshipId);
    
    if (!internship) {
      return res.status(404).json({ message: 'Internship not found' });
    }
    
    if (internship.company_id !== profile.id) {
      return res.status(403).json({ message: 'You can only reject your own internships' });
    }
    
    // Update internship status to 'rejected'
    const updated = await Internship.updateStatus(internshipId, 'rejected');
    
    if (!updated) {
      return res.status(404).json({ message: 'Internship not found' });
    }
    
    // Reject all pending applications for this internship
    const [applications] = await db.execute(
      `SELECT a.id, u.email as studentEmail, u.name as studentName
       FROM applications a
       JOIN student_profiles sp ON a.student_id = sp.id
       JOIN users u ON sp.user_id = u.id
       WHERE a.internship_id = ? AND a.status = 'pending'`,
      [internshipId]
    );
    
    // Update all pending applications to 'rejected'
    if (applications.length > 0) {
      await db.execute(
        'UPDATE applications SET status = ? WHERE internship_id = ? AND status = ?',
        ['rejected', internshipId, 'pending']
      );
      
      // Send email notifications to students
      for (const application of applications) {
        try {
          const emailResult = await sendApplicationStatusNotificationToStudent(
            application.studentEmail,
            application.studentName,
            internship.title,
            'rejected',
            req.user.name || 'Company'
          );
          
          if (emailResult.success) {
            console.log('Email notification sent successfully to student for rejected internship');
          } else {
            console.log('Email notification not sent to student:', emailResult.message || emailResult.error);
          }
        } catch (emailError) {
          console.error('Failed to send email notification to student:', emailError);
        }
      }
    }
    
    res.json({ message: 'Internship rejected successfully' });
  } catch (error) {
    console.error('Reject Internship Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};