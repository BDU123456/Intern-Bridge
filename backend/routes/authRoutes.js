import express from 'express';
import {
  registerStudent,
  registerCompany,
  login,
  forgotPassword,
  verifyResetCode,
  resetPassword
} from '../controllers/authController.js';
import { googleLogin } from '../controllers/googleAuthController.js';

const router = express.Router();

router.post("/register/student", registerStudent);
router.post("/register/company", registerCompany);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/verify-code", verifyResetCode);
router.post("/reset-password", resetPassword);

export default router;