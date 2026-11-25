import Admin from '../models/Admin.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import db from '../config/db.js';

// Admin login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find admin user in database
    const user = await User.findByEmail(email);
    
    // Check if user exists and is an admin
    if (!user || user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate JWT token for admin
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Get actual counts from database
    const [studentRows] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "student"');
    const [companyRows] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "company"');
    const [internshipRows] = await db.execute('SELECT COUNT(*) as count FROM internships');
    const [applicationRows] = await db.execute('SELECT COUNT(*) as count FROM applications');
    
    const stats = {
      totalStudents: studentRows[0].count,
      totalCompanies: companyRows[0].count,
      totalInternships: internshipRows[0].count,
      totalApplications: applicationRows[0].count
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

// Get all students
export const getAllStudents = async (req, res) => {
  try {
    const students = await Admin.getAllStudents();
    res.json({
      success: true,
      students
    });
  } catch (error) {
    console.error('Get All Students Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
};

// Get all companies
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await Admin.getAllCompanies();
    res.json({
      success: true,
      companies
    });
  } catch (error) {
    console.error('Get All Companies Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies'
    });
  }
};

// Approve student
export const approveStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'User is not a student'
      });
    }
    
    // Approve student
    await Admin.approveStudent(studentId);
    
    res.json({
      success: true,
      message: 'Student approved successfully'
    });
  } catch (error) {
    console.error('Approve Student Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve student'
    });
  }
};

// Reject student
export const rejectStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Check if student exists
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'User is not a student'
      });
    }
    
    // Reject student
    await Admin.rejectStudent(studentId);
    
    res.json({
      success: true,
      message: 'Student rejected and removed successfully'
    });
  } catch (error) {
    console.error('Reject Student Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject student'
    });
  }
};

// Approve company
export const approveCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Check if company exists
    const company = await User.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    if (company.role !== 'company') {
      return res.status(400).json({
        success: false,
        message: 'User is not a company'
      });
    }
    
    // Approve company
    await Admin.approveCompany(companyId);
    
    res.json({
      success: true,
      message: 'Company approved successfully'
    });
  } catch (error) {
    console.error('Approve Company Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve company'
    });
  }
};

// Remove company
export const removeCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    
    // Check if company exists
    const company = await User.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }
    
    if (company.role !== 'company') {
      return res.status(400).json({
        success: false,
        message: 'User is not a company'
      });
    }
    
    // Remove company
    await Admin.removeCompany(companyId);
    
    res.json({
      success: true,
      message: 'Company removed successfully'
    });
  } catch (error) {
    console.error('Remove Company Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove company'
    });
  }
};

// Get all internships
export const getAllInternships = async (req, res) => {
  try {
    console.log('Fetching internships...');
    
    // Query internships with company details using the correct schema
    const [rows] = await db.execute(`
      SELECT i.*, u.name as company_name, u.email as company_email 
      FROM internships i 
      JOIN company_profiles cp ON i.company_id = cp.id 
      JOIN users u ON cp.user_id = u.id 
      ORDER BY i.id DESC
    `);
    
    console.log('Found internships with company data:', rows.length);
    
    res.json({
      success: true,
      internships: rows
    });
  } catch (error) {
    console.error('Get All Internships Error:', error);
    
    // Fallback: try to get internships without company join
    try {
      const [fallbackRows] = await db.execute('SELECT * FROM internships ORDER BY id DESC');
      console.log('Fallback: Found internships without company data:', fallbackRows.length);
      
      const internshipsWithFallback = fallbackRows.map(internship => ({
        ...internship,
        company_name: 'Company ID: ' + internship.company_id,
        company_email: 'N/A'
      }));
      
      res.json({
        success: true,
        internships: internshipsWithFallback
      });
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch internships: ' + error.message
      });
    }
  }
};

// Approve internship
export const approveInternship = async (req, res) => {
  try {
    const { internshipId } = req.params;
    
    // Check if internship exists
    const [rows] = await db.execute('SELECT * FROM internships WHERE id = ?', [internshipId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }
    
    // Update internship status to active
    await db.execute('UPDATE internships SET status = ? WHERE id = ?', ['active', internshipId]);
    
    res.json({
      success: true,
      message: 'Internship approved successfully'
    });
  } catch (error) {
    console.error('Approve Internship Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve internship'
    });
  }
};

// Reject internship
export const rejectInternship = async (req, res) => {
  try {
    const { internshipId } = req.params;
    
    // Check if internship exists
    const [rows] = await db.execute('SELECT * FROM internships WHERE id = ?', [internshipId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }
    
    // Delete the internship from database completely
    await db.execute('DELETE FROM internships WHERE id = ?', [internshipId]);
    
    res.json({
      success: true,
      message: 'Internship rejected and removed successfully'
    });
  } catch (error) {
    console.error('Reject Internship Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject internship'
    });
  }
};

// New controller functions for privilege management

export const getAllPrivileges = async (req, res) => {
  try {
    const privileges = await Admin.getAllPrivileges();
    
    res.json({
      success: true,
      privileges
    });
  } catch (error) {
    console.error('Get All Privileges Error:', error);
    // Gracefully degrade if privileges table not available
    return res.json({
      success: true,
      privileges: []
    });
  }
};

export const getUsersWithPrivileges = async (req, res) => {
  try {
    const users = await Admin.getUsersWithPrivileges();
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get Users With Privileges Error:', error);
    // Gracefully return empty list if table not present
    return res.json({
      success: true,
      users: []
    });
  }
};

export const grantUserPrivilege = async (req, res) => {
  try {
    const { userId } = req.params;
    const { privilegeName, createIfNotExists, newUser } = req.body;
    const adminId = req.user.id;
    
    // Validate input
    if (!privilegeName) {
      return res.status(400).json({
        success: false,
        message: 'Privilege name is required'
      });
    }

    let targetUserId = userId;

    // If instructed, create the user if not exists
    if (createIfNotExists && newUser && !userId) {
      // newUser: { name, email, password, role }
      if (!newUser.email || !newUser.password) {
        return res.status(400).json({ success: false, message: 'New user email and password are required' });
      }
      try {
        targetUserId = await Admin.createBasicUser({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: 'privileged_admin'
        });
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message || 'Failed to create user' });
      }
    }
    
    // Ensure user role is set to privileged_admin
    try {
      await db.execute('UPDATE users SET role = ? WHERE id = ?', ['privileged_admin', targetUserId]);
    } catch (e) {
      console.warn('Failed to update user role to privileged_admin for user', targetUserId, e.message);
    }

    // Grant the privilege
    const result = await Admin.grantUserPrivilege(targetUserId, privilegeName, adminId);
    
    if (result) {
      res.json({
        success: true,
        message: `Privilege '${privilegeName}' granted successfully`,
        userId: targetUserId
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to grant privilege'
      });
    }
  } catch (error) {
    console.error('Grant User Privilege Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to grant privilege'
    });
  }
};

export const revokeUserPrivilege = async (req, res) => {
  try {
    const { userId } = req.params;
    const { privilegeName } = req.body;
    
    // Validate input
    if (!privilegeName) {
      return res.status(400).json({
        success: false,
        message: 'Privilege name is required'
      });
    }
    
    // Revoke the privilege
    const result = await Admin.revokeUserPrivilege(userId, privilegeName);
    
    if (result) {
      res.json({
        success: true,
        message: `Privilege '${privilegeName}' revoked successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to revoke privilege'
      });
    }
  } catch (error) {
    console.error('Revoke User Privilege Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to revoke privilege'
    });
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const createdBy = req.user.id;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }
    
    // Create admin user
    const userData = {
      name,
      email,
      password
    };
    
    const userId = await Admin.createAdminUser(userData, createdBy);
    
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      userId
    });
  } catch (error) {
    console.error('Create Admin User Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create admin user'
    });
  }
};

// Get user by email
export const getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    
    // Find user by email
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get User By Email Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};


export const getAdminUsers = async (req, res) => {
  try {
    const admins = await Admin.getAdminUsers();
    
    res.json({
      success: true,
      admins
    });
  } catch (error) {
    console.error('Get Admin Users Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin users'
    });
  }
};
