import db from '../config/db.js';

class Application {
  static async create(applicationData) {
    const [result] = await db.execute(
      'INSERT INTO applications (internship_id, student_id) VALUES (?, ?)',
      [applicationData.internshipId, applicationData.studentId]
    );
    return result.insertId;
  }

 // models/Application.js
static async findByCompanyId(companyId) {
  const [rows] = await db.execute(
    `SELECT a.*, i.title as internship_title,
            u.name as studentName,
            u.email as studentEmail,
            sp.resume as resume,
            sp.user_id as student_user_id
     FROM applications a
     JOIN internships i ON a.internship_id = i.id
     JOIN student_profiles sp ON a.student_id = sp.id
     JOIN users u ON sp.user_id = u.id
     WHERE i.company_id = ? AND i.status = 'active'`,
    [companyId]
  );
  
  // Get portfolio data for each applicant
  const applicantsWithPortfolio = await Promise.all(
    rows.map(async (row) => {
      try {
        // Get education data
        const [educationRows] = await db.execute(
          'SELECT * FROM portfolio_education WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
          [row.student_user_id]
        );
        
        // Get skills data
        const [skillsRows] = await db.execute(
          'SELECT skill FROM portfolio_skills WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
          [row.student_user_id]
        );
        
        // Get projects data
        const [projectsRows] = await db.execute(
          'SELECT title, description FROM portfolio_projects WHERE portfolio_id = (SELECT id FROM student_profiles WHERE user_id = ?)',
          [row.student_user_id]
        );
        
        return {
          ...row,
          education: educationRows || [],
          skills: skillsRows.map(s => s.skill) || [],
          projects: projectsRows || []
        };
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
        return {
          ...row,
          education: [],
          skills: [],
          projects: []
        };
      }
    })
  );
  
  return applicantsWithPortfolio;
}

  /**
   * Update application status
   * @param {number} applicationId - Application ID
   * @param {string} status - New status ('accepted' or 'rejected')
   * @returns {Promise<boolean>} - Whether the update was successful
   */
  static async updateStatus(applicationId, status) {
    const [result] = await db.execute(
      'UPDATE applications SET status = ? WHERE id = ?',
      [status, applicationId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Get application details by ID
   * @param {number} applicationId - Application ID
   * @returns {Promise<object>} - Application details
   */
  static async findById(applicationId) {
    const [rows] = await db.execute(`
      SELECT a.*,
             i.title as internship_title,
             i.status as internship_status,
             u.name as studentName,
             u.email as studentEmail,
             c.name as companyName,
             c.email as companyEmail
      FROM applications a
      JOIN internships i ON a.internship_id = i.id
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      JOIN company_profiles cp ON i.company_id = cp.id
      JOIN users c ON cp.user_id = c.id
      WHERE a.id = ?
    `, [applicationId]);
    return rows[0];
  }
}

export default Application;