import db from "../config/db.js";

class Company {
  static async createProfile(userId, { address, about }) {
    const [result] = await db.execute(
      "INSERT INTO company_profiles (user_id, address, about) VALUES (?, ?, ?)",
      [userId, address, about]
    );
    return result.insertId;
  }

  static async getProfile(userId) {
    const [rows] = await db.execute(
      `SELECT users.name, users.email, company_profiles.* 
       FROM users 
       JOIN company_profiles ON users.id = company_profiles.user_id 
       WHERE users.id = ?`,
      [userId]
    );
    return rows[0];
  }

  static async getByUserId(userId) {
    const [rows] = await db.execute(
      "SELECT * FROM company_profiles WHERE user_id = ?",
      [userId]
    );
    return rows[0];
  }

  static async updateProfile(userId, { name, address, about }) {
    // Update company name in users table
    if (name) {
      await db.execute(
        "UPDATE users SET name = ? WHERE id = ?",
        [name, userId]
      );
    }
    
    // Update address and about in company_profiles table
    const [result] = await db.execute(
      "UPDATE company_profiles SET address = ?, about = ? WHERE user_id = ?",
      [address, about, userId]
    );
    return result.affectedRows > 0;
  }
}

export default Company;