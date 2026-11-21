import db from "../config/db.js";

class User {
  static async create({ name, email, password, role }) {
    const [result] = await db.execute(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, password, role]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.execute("SELECT * FROM users WHERE id = ?", [id]);
    return rows[0];
  }

  static async update(userId, { name }) {
    const [result] = await db.execute(
      "UPDATE users SET name = ? WHERE id = ?",
      [name, userId]
    );
    return result.affectedRows > 0;
  }

  // New methods for privilege management

  static async getPrivileges(userId) {
    // Get all privileges for a specific user
    const [rows] = await db.execute(`
      SELECT p.name, p.description, up.granted_at, u.name as granted_by_name
      FROM user_privileges up
      JOIN privileges p ON up.privilege_id = p.id
      JOIN users u ON up.granted_by = u.id
      WHERE up.user_id = ?
    `, [userId]);
    
    return rows;
  }

  static async grantPrivilege(userId, privilegeName, grantedBy) {
    // Grant a specific privilege to a user
    const [privilege] = await db.execute(
      'SELECT id FROM privileges WHERE name = ?',
      [privilegeName]
    );
    
    if (!privilege[0]) {
      throw new Error(`Privilege '${privilegeName}' not found`);
    }
    
    const [result] = await db.execute(`
      INSERT IGNORE INTO user_privileges (user_id, privilege_id, granted_by)
      VALUES (?, ?, ?)
    `, [userId, privilege[0].id, grantedBy]);
    
    return result.affectedRows > 0;
  }

  static async revokePrivilege(userId, privilegeName) {
    // Revoke a specific privilege from a user
    const [privilege] = await db.execute(
      'SELECT id FROM privileges WHERE name = ?',
      [privilegeName]
    );
    
    if (!privilege[0]) {
      throw new Error(`Privilege '${privilegeName}' not found`);
    }
    
    const [result] = await db.execute(`
      DELETE FROM user_privileges 
      WHERE user_id = ? AND privilege_id = ?
    `, [userId, privilege[0].id]);
    
    return result.affectedRows > 0;
  }

  static async hasPrivilege(userId, privilegeName) {
    // Check if a user has a specific privilege
    const [rows] = await db.execute(`
      SELECT COUNT(*) as count
      FROM user_privileges up
      JOIN privileges p ON up.privilege_id = p.id
      WHERE up.user_id = ? AND p.name = ?
    `, [userId, privilegeName]);
    
    return rows[0].count > 0;
  }

  static async getAllUsersWithPrivileges() {
    // Get all users and their privileges
    const [rows] = await db.execute(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        GROUP_CONCAT(p.name) as privileges
      FROM users u
      LEFT JOIN user_privileges up ON u.id = up.user_id
      LEFT JOIN privileges p ON up.privilege_id = p.id
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY u.name
    `);
    
    return rows.map(row => ({
      ...row,
      privileges: row.privileges ? row.privileges.split(',') : []
    }));
  }
}

export default User;