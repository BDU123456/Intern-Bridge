import express from 'express';
import {
  getDashboardStats,
  getAllStudents,
  getAllCompanies,
  getAllInternships,
  approveStudent,
  rejectStudent,
  approveCompany,
  removeCompany,
  approveInternship,
  rejectInternship,
  adminLogin,
  // New privilege management functions
  getAllPrivileges,
  getUsersWithPrivileges,
  grantUserPrivilege,
  revokeUserPrivilege,
  createAdminUser,
  getAdminUsers,
  getUserByEmail
} from '../controllers/adminController.js';
import { getPaymentRequests, sendPaymentFormToStudent } from '../controllers/adminPaymentController.js';
import { getAllApplications, approveApplicationByAdmin } from '../controllers/adminApplicationsController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import privilegeCheckMiddleware from '../middlewares/privilegeCheckMiddleware.js';

const router = express.Router();

// Admin login route (no auth required)
router.post('/login', adminLogin);

// All other admin routes require authentication; allow admin and privileged (student/company) users
router.use(authMiddleware(['admin', 'student', 'company', 'privileged_admin']));

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);

// Student management routes
router.get('/students', getAllStudents);
router.post('/students/:studentId/approve', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_students'] }), 
  approveStudent
);
router.delete('/students/:studentId/reject', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_students'] }), 
  rejectStudent
);

// Company management routes
router.get('/companies', getAllCompanies);
router.post('/companies/:companyId/approve', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_companies'] }), 
  approveCompany
);
router.delete('/companies/:companyId/remove', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_companies'] }), 
  removeCompany
);

// Internship management routes
router.get('/internships', getAllInternships);
router.post('/internships/:internshipId/approve', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_internships'] }), 
  approveInternship
);
router.delete('/internships/:internshipId/reject', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_internships'] }), 
  rejectInternship
);

// Payment requests management
router.get('/payment/requests', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }),
  getPaymentRequests
);
router.post('/payment/requests/:applicationId/send',
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }),
  sendPaymentFormToStudent
);

// Applications tab endpoints
router.get('/applications',
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }),
  getAllApplications
);
router.post('/applications/:applicationId/approve',
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }),
  approveApplicationByAdmin
);

// Privilege management routes
router.get('/privileges', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }), 
  getAllPrivileges
);
router.get('/users/privileges', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }), 
  getUsersWithPrivileges
);
// Create user if not exists and/or grant privilege
router.post('/users/privileges',
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }),
  grantUserPrivilege
);
router.post('/users/:userId/privileges', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }), 
  grantUserPrivilege
);
router.delete('/users/:userId/privileges', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }), 
  revokeUserPrivilege
);
router.post('/admins', 
  privilegeCheckMiddleware({ 
    requiredPrivileges: ['manage_admins'],
    allowAdmins: false
  }), 
  createAdminUser
);
router.get('/admins', 
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }), 
  getAdminUsers
);

// User lookup route
router.get('/users/email/:email',
  privilegeCheckMiddleware({ requiredPrivileges: ['manage_admins'] }),
  getUserByEmail
);

export default router;
