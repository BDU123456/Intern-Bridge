import db from '../config/db.js';

class Internship {
  static async create(internshipData) {
    const [result] = await db.execute(
      'INSERT INTO internships (company_id, title, type, description, skills, location, duration, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        internshipData.companyId,
        internshipData.title,
        internshipData.type,
        internshipData.description,
        internshipData.skills,
        internshipData.location,
        internshipData.duration,
        internshipData.status || 'pending'
      ]
    );
    return result.insertId;
  }

  static async findByCompanyId(companyId) {
    const [rows] = await db.execute(
      'SELECT * FROM internships WHERE company_id = ? AND status = ?',
      [companyId, 'active']
    );
    return rows;
  }
  
  static async findAll() {
    const [rows] = await db.execute(
      `SELECT i.*, u.name as company_name
       FROM internships i
       JOIN company_profiles c ON i.company_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE i.status = 'active'`
    );
    return rows;
  }
  
  static async findAllActive() {
    const [rows] = await db.execute(
      `SELECT i.*, u.name as company_name
       FROM internships i
       JOIN company_profiles c ON i.company_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE i.status = 'active'`
    );
    return rows;
  }
  
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT * FROM internships WHERE id = ?',
      [id]
    );
    return rows[0];
  }
  
  static async updateStatus(id, status) {
    const [result] = await db.execute(
      'UPDATE internships SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }
  
  static async findByCompanyIdWithStatus(companyId, status) {
    const [rows] = await db.execute(
      'SELECT * FROM internships WHERE company_id = ? AND status = ?',
      [companyId, status]
    );
    return rows;
  }
}

export default Internship;