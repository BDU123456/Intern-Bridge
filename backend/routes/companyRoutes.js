import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getProfile,
  getInternships,
  createInternship,
  getApplicants,
  updateProfile,
  acceptApplication,
  rejectApplication,
  rejectInternship,
  readyToAccept
} from '../controllers/companyController.js';

const router = express.Router();

router.use(authMiddleware(['company']));

router.get('/profile', getProfile);
router.get('/internships', getInternships);
router.post('/internships', createInternship);
router.get('/applicants', getApplicants);
router.put('/profile', updateProfile);
router.post('/applications/:applicationId/ready', readyToAccept);
router.post('/applications/:applicationId/accept', acceptApplication);
router.post('/applications/:applicationId/reject', rejectApplication);
router.post('/internships/:internshipId/reject', rejectInternship);

export default router;