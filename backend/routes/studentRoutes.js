import express from 'express';
import multer from 'multer';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getProfile,
  updateProfile,
  updatePortfolio,
  uploadResume,
  getEducation,
  addEducation,
  getSkills,
  addSkill,
  getProjects,
  addProject,
  getApplications,
  getUserPrivileges,
  getResume
} from '../controllers/studentController.js';

const router = express.Router();

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf')) {
      return callback(new Error('Only PDF files are allowed'));
    }
    callback(null, true);
  }
}).single('resume');

const handleResumeUpload = (req, res, next) => {
  resumeUpload(req, res, error => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({ message: error.message });
    }
    next();
  });
};

// Update auth middleware to allow both students and companies
router.get('/resume/:fileName', authMiddleware(['student', 'company', 'admin', 'privileged_admin']), getResume);
router.use(authMiddleware(['student', 'company', 'privileged_admin']));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/portfolio', updatePortfolio);
router.post('/portfolio/resume', handleResumeUpload, uploadResume);
router.get('/education', authMiddleware(['student']), getEducation);
router.post('/education', authMiddleware(['student']), addEducation);
router.get('/skills', authMiddleware(['student']), getSkills);
router.post('/skills', authMiddleware(['student']), addSkill);
router.get('/projects', authMiddleware(['student']), getProjects);
router.post('/projects', authMiddleware(['student']), addProject);
router.get('/applications', getApplications);
router.get('/privileges', getUserPrivileges);

export default router;
