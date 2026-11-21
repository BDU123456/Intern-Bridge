import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'intern_bridge',
  waitForConnections: true,
  connectionLimit: 10,
  port: 3306
});

// Test connection
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    conn.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();

export default pool;