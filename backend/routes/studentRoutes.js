import express from 'express';
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
  getUserPrivileges
} from '../controllers/studentController.js';

const router = express.Router();

// Middleware to handle file uploads for resume
const handleFileUpload = (req, res, next) => {
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }
  
  // Parse multipart form data
  const boundary = req.headers['content-type'].split('boundary=')[1];
  if (!boundary) {
    return next();
  }
  
  // Extract file data from raw body
  const rawBody = req.rawBody;
  if (!rawBody) {
    return next();
  }
  
  // Simple multipart parser (this is a simplified version)
  const bodyString = rawBody.toString('binary');
  const parts = bodyString.split(`--${boundary}`);
  
  // Find the file part
  for (let i = 1; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part.includes('filename')) {
      // Extract filename
      const filenameMatch = part.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'unknown';
      
      // Extract content type
      const contentTypeMatch = part.match(/Content-Type: ([^\r\n]+)/);
      const contentType = contentTypeMatch ? contentTypeMatch[1] : 'application/octet-stream';
      
      // Extract file data (everything after the headers)
      const headerEnd = part.indexOf('\r\n\r\n') + 4;
      const fileData = part.substring(headerEnd).trim();
      
      // Convert file data to buffer
      const buffer = Buffer.from(fileData, 'binary');
      
      // Set req.file
      req.file = {
        originalname: filename,
        mimetype: contentType,
        buffer: buffer
      };
      break;
    }
  }
  
  next();
};

// Update auth middleware to allow both students and companies
router.use(authMiddleware(['student', 'company', 'privileged_admin']));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/portfolio', updatePortfolio);
router.post('/portfolio/resume', handleFileUpload, uploadResume);
router.get('/education', getEducation);
router.post('/education', addEducation);
router.get('/skills', getSkills);
router.post('/skills', addSkill);
router.get('/projects', getProjects);
router.post('/projects', addProject);
router.get('/applications', getApplications);
router.get('/privileges', getUserPrivileges);

export default router;