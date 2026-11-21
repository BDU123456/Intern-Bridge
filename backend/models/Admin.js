import db from '../config/db.js';
import bcrypt from 'bcrypt';

class Admin {
  // Get all students with their profiles
  static async getAllStudents() {
    const [rows] = await db.execute(`
      SELECT u.id, u.name, u.email, u.created_at, sp.phone, sp.university, sp.resume, sp.approved
      FROM users u
      JOIN student_profiles sp ON u.id = sp.user_id
      WHERE u.role = 'student'
      ORDER BY u.created_at DESC
    `);
    return rows;
  }

  // Get all companies with their profiles
  static async getAllCompanies() {
    const [rows] = await db.execute(`
      SELECT u.id, u.name, u.email, u.created_at, cp.address, cp.about, cp.approved
      FROM users u
      JOIN company_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'company'
      ORDER BY u.created_at DESC
    `);
    return rows;
  }

  // Approve a student
  static async approveStudent(studentId) {
    const [result] = await db.execute(
      'UPDATE student_profiles SET approved = TRUE WHERE user_id = ?',
      [studentId]
    );
    return result.affectedRows > 0;
  }

  // Reject a student (delete the user and related profile)
  static async rejectStudent(studentId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete portfolio data
      await connection.execute(
        'DELETE FROM portfolio_education WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
        [studentId]
      );
      
      await connection.execute(
        'DELETE FROM portfolio_skills WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
        [studentId]
      );
      
      await connection.execute(
        'DELETE FROM portfolio_projects WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
        [studentId]
      );
      
      // Delete applications
      await connection.execute(
        'DELETE FROM applications WHERE student_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
        [studentId]
      );
      
      // Delete student profile
      await connection.execute(
        'DELETE FROM student_profiles WHERE user_id = ?',
        [studentId]
      );
      
      // Delete user
      await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [studentId]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Approve a company
  static async approveCompany(companyId) {
    const [result] = await db.execute(
      'UPDATE company_profiles SET approved = TRUE WHERE user_id = ?',
      [companyId]
    );
    return result.affectedRows > 0;
  }

  // Remove a company (delete the user and related profile)
  static async removeCompany(companyId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Delete internships associated with this company
      await connection.execute(
        'DELETE FROM internships WHERE company_id = (SELECT id FROM company_profiles WHERE user_id = ?)',
        [companyId]
      );
      
      // Delete applications associated with this company's internships
      // Note: This would require a more complex query in practice
      
      // Delete company profile
      await connection.execute(
        'DELETE FROM company_profiles WHERE user_id = ?',
        [companyId]
      );
      
      // Delete user
      await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [companyId]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // New methods for privilege management

  static async getAllPrivileges() {
    // Get all available privileges
    const [rows] = await db.execute('SELECT * FROM privileges ORDER BY name');
    return rows;
  }

  static async getUsersWithPrivileges() {
    // Get all users with their privileges (similar to User.getAllUsersWithPrivileges but in Admin model)
    const [rows] = await db.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        GROUP_CONCAT(p.name) as privileges
      FROM users u
      LEFT JOIN user_privileges up ON u.id = up.user_id
      LEFT JOIN privileges p ON up.privilege_id = p.id
      WHERE u.role != 'admin'  -- Exclude admin users
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.name
    `);
    
    return rows.map(row => ({
      ...row,
      privileges: row.privileges ? row.privileges.split(',') : []
    }));
  }

  static async grantUserPrivilege(userId, privilegeName, grantedBy) {
    // Grant a specific privilege to a user
    const [privilege] = await db.execute(
      'SELECT id FROM privileges WHERE name = ?',
      [privilegeName]
    );

    // If privilege doesn't exist, create it with a sensible default description
    let privilegeId;
    if (!privilege[0]) {
      const descriptions = {
        manage_students: 'Can approve/reject student profiles',
        manage_companies: 'Can approve/reject company profiles',
        manage_internships: 'Can approve/reject internships',
        manage_admins: 'Can grant/revoke privileges to other users',
        view_statistics: 'Can view dashboard statistics',
        manage_applications: 'Can view and manage internship applications'
      };
      const description = descriptions[privilegeName] || null;
      const [insertResult] = await db.execute(
        'INSERT INTO privileges (name, description) VALUES (?, ?)',
        [privilegeName, description]
      );
      privilegeId = insertResult.insertId;
    } else {
      privilegeId = privilege[0].id;
    }
    
    // Check if user exists and is not an admin
    const [user] = await db.execute(
      'SELECT id, role FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user[0]) {
      throw new Error('User not found');
    }
    
    if (user[0].role === 'admin') {
      throw new Error('Cannot modify privileges of admin users');
    }
    
    const [result] = await db.execute(`
      INSERT IGNORE INTO user_privileges (user_id, privilege_id, granted_by)
      VALUES (?, ?, ?)
    `, [userId, privilegeId, grantedBy]);
    
    return result.affectedRows > 0;
  }

  static async revokeUserPrivilege(userId, privilegeName) {
    // Revoke a specific privilege from a user
    const [privilege] = await db.execute(
      'SELECT id FROM privileges WHERE name = ?',
      [privilegeName]
    );
    
    if (!privilege[0]) {
      throw new Error(`Privilege '${privilegeName}' not found`);
    }
    
    // Check if user exists and is not an admin
    const [user] = await db.execute(
      'SELECT id, role FROM users WHERE id = ?',
      [userId]
    );
    
    if (!user[0]) {
      throw new Error('User not found');
    }
    
    if (user[0].role === 'admin') {
      throw new Error('Cannot modify privileges of admin users');
    }
    
    const [result] = await db.execute(`
      DELETE FROM user_privileges 
      WHERE user_id = ? AND privilege_id = ?
    `, [userId, privilege[0].id]);
    
    return result.affectedRows > 0;
  }

  static async createBasicUser(userData) {
    // Create a new basic user (student or company) with hashed password and minimal profile
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const role = userData.role && ['student', 'company'].includes(userData.role) ? userData.role : 'student';

      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Check existing email
      const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [userData.email]);
      if (existing.length > 0) {
        throw new Error('Email already exists');
      }

      // Create the user with chosen role
      const [result] = await connection.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [userData.name || userData.email.split('@')[0], userData.email, hashedPassword, role]
      );

      const userId = result.insertId;

      // Create minimal profile row depending on role
      if (role === 'student') {
        await connection.execute(
          'INSERT INTO student_profiles (user_id, phone, university) VALUES (?, ?, ?)',
          [userId, '', '']
        );
      } else if (role === 'company') {
        await connection.execute(
          'INSERT INTO company_profiles (user_id, address, about, approved) VALUES (?, ?, ?, ?)',
          [userId, '', '', 0]
        );
      }

      await connection.commit();
      return userId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async createAdminUser(userData, createdBy) {
    // Create a new admin user with all privileges
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Hash the password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      // Create the user with admin role
      const [result] = await connection.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [userData.name, userData.email, hashedPassword, 'admin']
      );
      
      const userId = result.insertId;
      
      // Grant all privileges to the new admin user
      await connection.execute(`
        INSERT INTO user_privileges (user_id, privilege_id, granted_by)
        SELECT ?, id, ?
        FROM privileges
      `, [userId, createdBy]);
      
      await connection.commit();
      return userId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getAdminUsers() {
    // Get all admin users with their privileges
    const [rows] = await db.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.created_at,
        GROUP_CONCAT(p.name) as privileges
      FROM users u
      LEFT JOIN user_privileges up ON u.id = up.user_id
      LEFT JOIN privileges p ON up.privilege_id = p.id
      WHERE u.role = 'admin'
      GROUP BY u.id, u.name, u.email, u.created_at
      ORDER BY u.name
    `);
    
    return rows.map(row => ({
      ...row,
      privileges: row.privileges ? row.privileges.split(',') : []
    }));
  }
}

export default Admin;