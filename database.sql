-- Intern Bridge database schema
-- Run this script in MySQL Workbench or with: mysql -u root -p < database.sql
-- This creates missing tables without deleting existing data.

CREATE DATABASE IF NOT EXISTS intern_bridge
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE intern_bridge;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password VARCHAR(255) NOT NULL DEFAULT '',
  role VARCHAR(30) NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_profiles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  phone VARCHAR(40) NOT NULL DEFAULT '',
  university VARCHAR(200) NOT NULL DEFAULT '',
  resume VARCHAR(255) NULL,
  approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_student_profiles_user (user_id),
  KEY idx_student_profiles_approved (approved),
  CONSTRAINT fk_student_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS company_profiles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  address VARCHAR(255) NOT NULL DEFAULT '',
  about TEXT NULL,
  approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_company_profiles_user (user_id),
  KEY idx_company_profiles_approved (approved),
  CONSTRAINT fk_company_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS internships (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  company_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  type VARCHAR(100) NULL,
  description TEXT NOT NULL,
  skills TEXT NULL,
  location VARCHAR(200) NULL,
  duration VARCHAR(100) NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_internships_company (company_id),
  KEY idx_internships_status (status),
  CONSTRAINT fk_internships_company
    FOREIGN KEY (company_id) REFERENCES company_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS applications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  internship_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_application_student_internship (internship_id, student_id),
  KEY idx_applications_student (student_id),
  KEY idx_applications_status (status),
  CONSTRAINT fk_applications_internship
    FOREIGN KEY (internship_id) REFERENCES internships (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_applications_student
    FOREIGN KEY (student_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS portfolio_education (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  portfolio_id INT UNSIGNED NOT NULL,
  institution VARCHAR(200) NOT NULL,
  degree VARCHAR(200) NOT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  PRIMARY KEY (id),
  KEY idx_portfolio_education_portfolio (portfolio_id),
  CONSTRAINT fk_portfolio_education_student
    FOREIGN KEY (portfolio_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS portfolio_skills (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  portfolio_id INT UNSIGNED NOT NULL,
  skill VARCHAR(150) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_portfolio_skills_portfolio (portfolio_id),
  CONSTRAINT fk_portfolio_skills_student
    FOREIGN KEY (portfolio_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS portfolio_projects (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  portfolio_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  PRIMARY KEY (id),
  KEY idx_portfolio_projects_portfolio (portfolio_id),
  CONSTRAINT fk_portfolio_projects_student
    FOREIGN KEY (portfolio_id) REFERENCES student_profiles (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS privileges (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_privileges_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_privileges (
  user_id INT UNSIGNED NOT NULL,
  privilege_id INT UNSIGNED NOT NULL,
  granted_by INT UNSIGNED NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, privilege_id),
  KEY idx_user_privileges_privilege (privilege_id),
  KEY idx_user_privileges_granted_by (granted_by),
  CONSTRAINT fk_user_privileges_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_privileges_privilege
    FOREIGN KEY (privilege_id) REFERENCES privileges (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_privileges_granted_by
    FOREIGN KEY (granted_by) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

INSERT INTO privileges (name, description) VALUES
  ('manage_students', 'Approve or reject student profiles'),
  ('manage_companies', 'Approve or reject company profiles'),
  ('manage_internships', 'Approve or reject internship listings'),
  ('manage_admins', 'Manage user privileges and admin access'),
  ('view_statistics', 'View dashboard statistics'),
  ('manage_applications', 'View and manage internship applications')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Optional verification queries:
-- SHOW TABLES;
-- SELECT * FROM privileges ORDER BY name;
