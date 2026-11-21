import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import internshipRoutes from './routes/internshipRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// Create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS Configuration
// server.js - Update CORS configuration
app.use(cors({
  origin: [
    "http://localhost:5500",     // VS Code Live Server
    "http://127.0.0.1:5500",     // Alternative localhost
    "http://localhost:8000",     // Python HTTP server
    "http://localhost:8080",     // Common alternative port
    "http://localhost:5005"      // Backend itself
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors()); // Enable pre-flight requests


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    // Increase limit for file uploads
    express.raw({
      type: 'multipart/form-data',
      limit: '10mb',
      verify: (req, res, buf, encoding) => {
        // Store the raw buffer for file uploads
        req.rawBody = buf;
      }
    })(req, res, next);
  } else {
    next();
  }
});


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'home.html'));
});

// Serve login/register page for specific routes
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Serve admin dashboard
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'admin.html'));
});

// Serve privileged user dashboard
app.get('/privileged-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'privileged-dashboard.html'));
});

// Static files (placed after route handlers to avoid conflicts)
app.use(express.static(path.join(__dirname, '../frontend'), { index: false }));

// Serve uploaded files
app.use('/api/uploads', express.static(path.join(__dirname, 'controllers', 'uploads')));

// Error handling
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ 
    success: false,
    message: 'Internal Server Error' 
  });
});

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`
  ==================================
  🚀 Backend running on port ${PORT}
  🌐 Access at: http://localhost:${PORT}
  ==================================
  `);
});