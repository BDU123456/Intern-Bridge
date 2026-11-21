import db from '../config/db.js';

class Student {
  static async createProfile(userId, { phone, university }) {
    const [result] = await db.execute(
      'INSERT INTO student_profiles (user_id, phone, university) VALUES (?, ?, ?)',
      [userId, phone, university]
    );
    return result.insertId;
  }

  static async getProfile(userId) {
    const [rows] = await db.execute(
      `SELECT 
        users.id, 
        users.name, 
        users.email, 
        users.role,
        student_profiles.phone,
        student_profiles.university,
        student_profiles.resume,
        student_profiles.created_at
       FROM users 
       JOIN student_profiles ON users.id = student_profiles.user_id 
       WHERE users.id = ?`,
      [userId]
    );
    return rows[0];
  }

  static async updateResume(userId, resumePath) {
    const [result] = await db.execute(
      'UPDATE student_profiles SET resume = ? WHERE user_id = ?',
      [resumePath, userId]
    );
    return result.affectedRows > 0;
  }

  static async updateProfile(userId, { phone, university }) {
    const [result] = await db.execute(
      'UPDATE student_profiles SET phone = ?, university = ? WHERE user_id = ?',
      [phone, university, userId]
    );
    return result.affectedRows > 0;
  }

  static async updateEducation(userId, educationId, { institution, degree, start_date, end_date }) {
    // Handle cases where start_date and end_date might be undefined or null
    // Convert 'YYYY-MM' format to 'YYYY-MM-DD' for MySQL DATE type
    const startDate = start_date ? `${start_date}-01` : null;
    const endDate = end_date ? `${end_date}-01` : null;
    
    const [result] = await db.execute(
      `UPDATE portfolio_education pe
       JOIN student_profiles sp ON pe.portfolio_id = sp.id
       SET institution = ?, degree = ?, start_date = ?, end_date = ?
       WHERE pe.id = ? AND sp.user_id = ?`,
      [institution, degree, startDate, endDate, educationId, userId]
    );
    return result.affectedRows > 0;
  }

  static async deleteEducation(userId, educationId) {
    const [result] = await db.execute(
      `DELETE pe FROM portfolio_education pe
       JOIN student_profiles sp ON pe.portfolio_id = sp.id
       WHERE pe.id = ? AND sp.user_id = ?`,
      [educationId, userId]
    );
    return result.affectedRows > 0;
  }

  static async addEducation(userId, { institution, degree, start_date, end_date }) {
     // Handle cases where start_date and end_date might be undefined or null
     // Convert 'YYYY-MM' format to 'YYYY-MM-DD' for MySQL DATE type
     const startDate = start_date ? `${start_date}-01` : null;
     const endDate = end_date ? `${end_date}-01` : null;
     
     const [result] = await db.execute(
      'INSERT INTO portfolio_education (portfolio_id, institution, degree, start_date, end_date) ' +
     'VALUES ((SELECT id FROM student_profiles WHERE user_id = ?), ?, ?, ?, ?)',
     [userId, institution, degree, startDate, endDate]
   );
    return result.insertId;
  }

  static async getEducation(userId) {
     const [rows] = await db.execute(
       'SELECT * FROM portfolio_education WHERE portfolio_id = ' +
       '(SELECT id FROM student_profiles WHERE user_id = ?)',
       [userId]
     );
     // Convert dates from 'YYYY-MM-DD' to 'YYYY-MM' format for the frontend
     return rows.map(row => ({
       ...row,
       start_date: row.start_date ? new Date(row.start_date).toISOString().split('T')[0].substring(0, 7) : null,
       end_date: row.end_date ? new Date(row.end_date).toISOString().split('T')[0].substring(0, 7) : null
     }));
   }

   static async addSkill(userId, skill) {
     const [result] = await db.execute(
       'INSERT INTO portfolio_skills (portfolio_id, skill) ' +
       'VALUES ((SELECT id FROM student_profiles WHERE user_id = ?), ?)',
       [userId, skill]
     );
     return result.insertId;
   }

   static async getSkills(userId) {
     const [rows] = await db.execute(
       'SELECT * FROM portfolio_skills WHERE portfolio_id = ' +
       '(SELECT id FROM student_profiles WHERE user_id = ?)',
       [userId]
     );
     return rows.map(row => row.skill);
   }

   static async updateSkill(userId, skillId, newSkill) {
     const [result] = await db.execute(
       `UPDATE portfolio_skills ps
        JOIN student_profiles sp ON ps.portfolio_id = sp.id
        SET skill = ?
        WHERE ps.id = ? AND sp.user_id = ?`,
       [newSkill, skillId, userId]
     );
     return result.affectedRows > 0;
   }

   static async deleteSkill(userId, skillId) {
     const [result] = await db.execute(
       `DELETE ps FROM portfolio_skills ps
        JOIN student_profiles sp ON ps.portfolio_id = sp.id
        WHERE ps.id = ? AND sp.user_id = ?`,
       [skillId, userId]
     );
     return result.affectedRows > 0;
   }

   static async addProject(userId, { title, description }) {
     const [result] = await db.execute(
       'INSERT INTO portfolio_projects (portfolio_id, title, description) ' +
       'VALUES ((SELECT id FROM student_profiles WHERE user_id = ?), ?, ?)',
       [userId, title, description]
     );
     return result.insertId;
   }

   static async updateProject(userId, projectId, { title, description }) {
     const [result] = await db.execute(
       `UPDATE portfolio_projects pp
        JOIN student_profiles sp ON pp.portfolio_id = sp.id
        SET title = ?, description = ?
        WHERE pp.id = ? AND sp.user_id = ?`,
       [title, description, projectId, userId]
     );
     return result.affectedRows > 0;
   }

   static async deleteProject(userId, projectId) {
     const [result] = await db.execute(
       `DELETE pp FROM portfolio_projects pp
        JOIN student_profiles sp ON pp.portfolio_id = sp.id
        WHERE pp.id = ? AND sp.user_id = ?`,
       [projectId, userId]
     );
     return result.affectedRows > 0;
   }

   static async getProjects(userId) {
     const [rows] = await db.execute(
       'SELECT * FROM portfolio_projects WHERE portfolio_id = ' +
       '(SELECT id FROM student_profiles WHERE user_id = ?)',
       [userId]
     );
     return rows;
   }

   static async getAppliedInternships(userId) {
    const [rows] = await db.execute(
      `SELECT i.*, a.status as application_status, a.applied_at
       FROM applications a
       JOIN student_profiles sp ON a.student_id = sp.id
       JOIN internships i ON i.id = a.internship_id
       WHERE sp.user_id = ?`,
      [userId]
    );
    return rows;
  }
 }


export default Student;
