import db from '../config/db.js';
import Application from '../models/Application.js';
import { sendEmail } from '../utils/emailService.js';

export const getPaymentRequests = async (req, res) => {
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
      WHERE a.status = 'awaiting_admin_payment_send'
      ORDER BY a.id DESC
    `);

    res.json({ success: true, requests: rows });
  } catch (error) {
    console.error('Get Payment Requests Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment requests' });
  }
};

export const sendPaymentFormToStudent = async (req, res) => {
  try {
    const { applicationId } = req.params;
    if (!applicationId) return res.status(400).json({ success: false, message: 'applicationId required' });

    const app = await Application.findById(applicationId);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    // Allow admin to send payment at any pre-finalized status; normalize state to awaiting_payment
    const finalStatuses = ['accepted', 'rejected'];
    if (finalStatuses.includes(app.status)) {
      return res.status(400).json({ success: false, message: `Cannot send payment for a ${app.status} application` });
    }

    const telebirAmount = '50 birr';
    const telebir = '0980539255';

    const subject = `Payment Instructions for ${app.internship_title}`;
    const text = `Hello ${app.studentName},\n\n` +
      `Please transfer ${telebirAmount} via Telebirr to finish.\n` +
      `Telebirr number: ${telebir}.\n\n` +
      `After payment is verified by admin, your application will be finalized.\n\n` +
      `Best regards,\nInternBridge Team`;
    const html = `
      <div style=\"font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;\">\n        <h2 style=\"color:#333\">Payment Instructions</h2>\n        <p>Hello <strong>${app.studentName}</strong>,</p>\n        <p>Please transfer <strong>${telebirAmount}</strong> via Telebirr to finish.</p>\n        <p>Telebirr number: <strong>${telebir}</strong></p>\n        <p>After payment is verified by admin, your application will be finalized.</p>\n        <p>Best regards,<br>InternBridge Team</p>\n      </div>\n    `;

    try {
      await sendEmail(app.studentEmail, subject, text, html);
    } catch (emailErr) {
      console.error('Email send failed (payment instructions):', emailErr);
      // continue; do not fail the request
    }

    await db.execute('UPDATE applications SET status = ? WHERE id = ?', ['awaiting_payment', applicationId]);

    res.json({ success: true, message: 'Payment instructions sent to student' });
  } catch (error) {
    console.error('Send Payment Form Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send payment form' });
  }
};
