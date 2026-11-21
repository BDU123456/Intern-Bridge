import express from 'express';
import db from '../config/db.js';
import Application from '../models/Application.js';
import { sendPaymentReceivedNotificationToCompany } from '../utils/paymentEmailService.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import privilegeCheckMiddleware from '../middlewares/privilegeCheckMiddleware.js';

const router = express.Router();

// Confirm payment (mock) and notify company
router.post(
  '/confirm',
  authMiddleware(['admin']),
  privilegeCheckMiddleware({
    requiredPrivileges: ['manage_admins'],
    allowAdmins: false
  }),
  async (req, res) => {
    try {
      const { applicationId } = req.body;
      if (!applicationId) return res.status(400).json({ message: 'applicationId required' });

      const app = await Application.findById(applicationId);
      if (!app) return res.status(404).json({ message: 'Application not found' });

      if (app.status !== 'awaiting_payment') {
        return res.status(409).json({
          success: false,
          message: `Cannot confirm payment while application status is '${app.status}'`
        });
      }

      // Set status to payment_confirmed
      await Application.updateStatus(applicationId, 'payment_confirmed');

      // Notify company to finalize
      await sendPaymentReceivedNotificationToCompany({
        companyEmail: app.companyEmail,
        companyName: app.companyName,
        internshipTitle: app.internship_title,
        studentName: app.studentName
      });

      res.json({ success: true, message: 'Payment confirmed' });
    } catch (e) {
      console.error('Payment confirm error:', e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

export default router;
