import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  let connection;
  try {
    const { tokenId } = req.body;

    // Verify the token with Google
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Check if user already exists with this email
      const [existingUsers] = await connection.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (existingUsers.length > 0) {
        const user = existingUsers[0];
        
        // Check if this is a Google user (password is empty)
        if (user.password === '') {
          // Require admin approval for student/company before allowing login
          if (user.role === 'student') {
            const [rows] = await connection.query('SELECT approved FROM student_profiles WHERE user_id = ?', [user.id]);
            if (!rows.length || !rows[0].approved) {
              await connection.rollback();
              return res.status(403).json({ success: false, message: 'Your account is pending admin approval' });
            }
          } else if (user.role === 'company') {
            const [rows] = await connection.query('SELECT approved FROM company_profiles WHERE user_id = ?', [user.id]);
            if (!rows.length || !rows[0].approved) {
              await connection.rollback();
              return res.status(403).json({ success: false, message: 'Your account is pending admin approval' });
            }
          }

          // User exists and registered with Google, allow login
          const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
          );

          await connection.commit();
          
          return res.json({
            success: true,
            message: 'Google login successful',
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            }
          });
        } else {
          // User exists with regular email/password registration
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'User already exists with this email. Please login with your password.'
          });
        }
      }

      // User doesn't exist, create new student account as pending
      // Note: We're only allowing Google Sign-In for students, not companies
      const [userResult] = await connection.query(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, '', 'student'] // Empty password for Google users
      );

      // Create student profile with approved = 0
      await connection.query(
        'INSERT INTO student_profiles (user_id, phone, university, approved) VALUES (?, ?, ?, ?)',
        [userResult.insertId, '', '', 0]
      );

      await connection.commit();

      return res.status(403).json({
        success: false,
        message: 'Registration submitted. Awaiting admin approval.'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Google authentication error:', error);
    if (connection) await connection.rollback();
    res.status(500).json({
      success: false,
      message: 'Google authentication failed'
    });
  } finally {
    if (connection) connection.release();
  }
};