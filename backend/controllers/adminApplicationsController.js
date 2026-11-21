import db from '../config/db.js';
import { sendEmail } from '../utils/emailService.js';

// List all applications for admin Applications tab
export const getAllApplications = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        a.id AS applicationId,
        a.status,
        i.title AS internship_title,
        cu.name AS companyName,
        cu.email AS companyEmail,
        su.name AS studentName,
        su.email AS studentEmail
      FROM applications a
      JOIN internships i ON a.internship_id = i.id
      JOIN company_profiles cp ON i.company_id = cp.id
      JOIN users cu ON cp.user_id = cu.id
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users su ON sp.user_id = su.id
      ORDER BY a.id DESC
    `);
    res.json({ success: true, applications: rows });
  } catch (error) {
    console.error('Get All Applications Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
};

// Admin approves application: finalize acceptance and notify student
export const approveApplicationByAdmin = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const [rows] = await db.execute(`
      SELECT 
        a.id AS applicationId,
        a.status,
        i.title AS internship_title,
        cu.name AS companyName,
        cu.email AS companyEmail,
        su.name AS studentName,
        su.email AS studentEmail
      FROM applications a
      JOIN internships i ON a.internship_id = i.id
      JOIN company_profiles cp ON i.company_id = cp.id
      JOIN users cu ON cp.user_id = cu.id
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users su ON sp.user_id = su.id
      WHERE a.id = ?
    `, [applicationId]);
    const app = rows[0];
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    // Update status to accepted
    await db.execute('UPDATE applications SET status = ? WHERE id = ?', ['accepted', applicationId]);

    // Send email to student: Accepted notification (includes company name)
    try {
      await sendEmail(
        app.studentEmail,
        `Application Accepted for ${app.internship_title} by ${app.companyName}`,
        `Hello ${app.studentName},\n\nYou are accepted for ${app.internship_title} by ${app.companyName}.\n\nBest regards,\nInternBridge Team`,
        `<p>Hello <strong>${app.studentName}</strong>,</p><p>You are accepted for <strong>${app.internship_title}</strong> by <strong>${app.companyName}</strong>.</p><p>Best regards,<br>InternBridge Team</p>`
      );
    } catch (e) {
      console.error('Failed to send student acceptance email:', e);
    }

    // Optionally notify company of acceptance
    try {
      await sendEmail(
        app.companyEmail,
        `Application Accepted - ${app.internship_title}`,
        `The student ${app.studentName} has been accepted for ${app.internship_title}.`,
        `<p>The student <strong>${app.studentName}</strong> has been accepted for <strong>${app.internship_title}</strong>.</p>`
      );
    } catch (e) {
      console.error('Failed to send company notification email:', e);
    }

    res.json({ success: true, message: 'Application approved and notifications sent' });
  } catch (error) {
    console.error('Admin Approve Application Error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve application' });
  }
};
