import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { sendEmail } from '../utils/emailService.js';

// In-memory storage for reset codes (in production, use Redis or database)
const resetCodes = new Map();

export const registerCompany = async (req, res) => {
  let connection;
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [existing] = await connection.query(
        'SELECT id FROM users WHERE email = ?', 
        [email]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [userResult] = await connection.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, 'company']
      );

      await connection.query(
        'INSERT INTO company_profiles (user_id, address, about, approved) VALUES (?, ?, ?, ?)',
        [userResult.insertId, '', '', 0]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Registration submitted. Awaiting admin approval.'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Company registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Company registration failed'
    });
  } finally {
    if (connection) connection.release();
  }
};

export const registerStudent = async (req, res) => {
  let connection;
  try {
    const { name, email, password, confirmPassword, phone, university } = req.body;

    if (!name || !email || !password || !confirmPassword || !phone || !university) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      const [existing] = await connection.query(
        'SELECT id FROM users WHERE email = ?', 
        [email]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [userResult] = await connection.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, 'student']
      );

      await connection.query(
        'INSERT INTO student_profiles (user_id, phone, university, approved) VALUES (?, ?, ?, ?)',
        [userResult.insertId, phone, university, 0]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Registration submitted. Awaiting admin approval.'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Student registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Student registration failed'
    });
  } finally {
    if (connection) connection.release();
  }
};

// Update the login function
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Require admin approval for student and company accounts
    if (user.role === 'student') {
      const [rows] = await db.query('SELECT approved FROM student_profiles WHERE user_id = ?', [user.id]);
      if (!rows.length || !rows[0].approved) {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval'
        });
      }
    } else if (user.role === 'company') {
      const [rows] = await db.query('SELECT approved FROM company_profiles WHERE user_id = ?', [user.id]);
      if (!rows.length || !rows[0].approved) {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval'
        });
      }
    }

    // Add debug logging
    console.log(`User logged in: ${user.email} (${user.role})`);
    
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Add detailed error logging
    if (error.code) console.error('Database error code:', error.code);
    if (error.sql) console.error('SQL query:', error.sql);
    if (error.sqlMessage) console.error('SQL message:', error.sqlMessage);
    
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message // Send actual error to frontend for debugging
    });
  }
};

// Generate a random 4-digit code
const generateResetCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Forgot password function
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const [users] = await db.query(
      'SELECT id, name, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Generate 4-digit reset code
    const resetCode = generateResetCode();
    
    // Store reset code with timestamp (60 seconds expiration)
    resetCodes.set(email, {
      code: resetCode,
      timestamp: Date.now(),
      userId: user.id,
      userName: user.name,
      userRole: user.role
    });

    // Send reset code via email
    const subject = 'Password Reset Code - InternBridge';
    const text = `Hello ${user.name},

You have requested to reset your password. Please use the following 4-digit code to reset your password:

${resetCode}

This code will expire in 60 seconds.

If you did not request this, please ignore this email.

Best regards,
InternBridge Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello <strong>${user.name}</strong>,</p>
        <p>You have requested to reset your password. Please use the following 4-digit code to reset your password:</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
          <h1 style="font-size: 36px; color: #007bff; margin: 0;">${resetCode}</h1>
        </div>
        <p><strong>This code will expire in 60 seconds.</strong></p>
        <p>If you did not request this, please ignore this email.</p>
        <br>
        <p>Best regards,<br>
        <strong>InternBridge Team</strong></p>
      </div>
    `;

    const emailResult = await sendEmail(email, subject, text, html);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send reset code email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Reset code sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process forgot password request'
    });
  }
};

// Verify reset code function
export const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and code are required'
      });
    }

    // Check if reset code exists
    const resetData = resetCodes.get(email);
    if (!resetData) {
      return res.status(404).json({
        success: false,
        message: 'Reset code not found or expired'
      });
    }

    // Check if code matches
    if (resetData.code !== code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code'
      });
    }

    // Check if code is expired (60 seconds)
    const currentTime = Date.now();
    const codeAge = currentTime - resetData.timestamp;
    const maxAge = 60 * 1000; // 60 seconds in milliseconds

    if (codeAge > maxAge) {
      // Remove expired code
      resetCodes.delete(email);
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired'
      });
    }

    res.json({
      success: true,
      message: 'Reset code verified successfully'
    });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify reset code'
    });
  }
};

// Reset password function
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword, confirmPassword } = req.body;

    if (!email || !code || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Check password strength (at least 8 characters with 1 number and uppercase)
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with 1 number and uppercase letter'
      });
    }

    // Check if reset code exists
    const resetData = resetCodes.get(email);
    if (!resetData) {
      return res.status(404).json({
        success: false,
        message: 'Reset code not found or expired'
      });
    }

    // Check if code matches
    if (resetData.code !== code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset code'
      });
    }

    // Check if code is expired (60 seconds)
    const currentTime = Date.now();
    const codeAge = currentTime - resetData.timestamp;
    const maxAge = 60 * 1000; // 60 seconds in milliseconds

    if (codeAge > maxAge) {
      // Remove expired code
      resetCodes.delete(email);
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await db.query(
      'UPDATE users SET password = ? WHERE email = ?',
      [hashedPassword, email]
    );

    // Remove reset code after successful password reset
    resetCodes.delete(email);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};