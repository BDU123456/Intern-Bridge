import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Debug: Log environment variables
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '*** (set)' : '*** (not set)');

// Debug: Log environment variables
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '*** (set)' : '*** (not set)');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

// Create transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter configuration
console.log('Transporter created with config:', {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? '*** (set)' : '*** (not set)'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter connection (non-blocking)
console.log('Attempting transporter verification...');
console.log('Using EMAIL_USER:', process.env.EMAIL_USER);
console.log('Using EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);
transporter.verify((error, success) => {
  if (error) {
    console.error('Transporter verification failed:', error.message);
    console.error('Email notifications may not work. Please check your Gmail credentials.');
    console.error('Make sure you are using an app password, not your regular Gmail password.');
    console.error('Also ensure 2-factor authentication is enabled on your Gmail account.');
    
    // Log additional debugging information
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      console.error('Debug info:');
      console.error('- EMAIL_USER:', process.env.EMAIL_USER);
      console.error('- EMAIL_PASS length:', process.env.EMAIL_PASS.length);
      console.error('- EMAIL_PASS contains spaces:', process.env.EMAIL_PASS.includes(' '));
      console.error('- EMAIL_PASS is 16 characters:', process.env.EMAIL_PASS.length === 16);
    }
  } else {
    console.log('Transporter verification successful');
  }
});

/**
 * Send email notification
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} html - HTML content (optional)
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendEmail = async (to, subject, text, html = null) => {
  // Check if email notifications are disabled
  if (process.env.DISABLE_EMAIL === 'true') {
    console.log('Email notifications are disabled. Skipping email to:', to);
    return { success: true, message: 'Email notifications disabled' };
  }
  
  try {
    // Validate environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email configuration is incomplete. Email notification will not be sent.');
      return { success: false, message: 'Email configuration is incomplete' };
    }

    // Check if EMAIL_PASS contains spaces (common issue with app passwords)
    if (process.env.EMAIL_PASS && process.env.EMAIL_PASS.includes(' ')) {
      console.warn('EMAIL_PASS contains spaces. This may cause authentication issues.');
      console.warn('Make sure to remove spaces from your app password.');
    }
    
    // Check if EMAIL_PASS is the correct length (16 characters for Gmail app passwords)
    if (process.env.EMAIL_PASS && process.env.EMAIL_PASS.length !== 16) {
      console.warn(`EMAIL_PASS is ${process.env.EMAIL_PASS.length} characters long. Gmail app passwords are typically 16 characters.`);
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html
    };

    console.log(`Attempting to send email to: ${to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.response);
    return { success: true, info };
  } catch (error) {
    console.error('Error sending email:', error.message);
    console.error('Email configuration:', {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: process.env.EMAIL_USER ? '*** (set)' : '*** (not set)',
      from: process.env.EMAIL_FROM
    });
    
    // Provide specific guidance for common Gmail errors
    if (error.code === 'EAUTH' || error.responseCode === 535 || error.message.includes('534-5.7.9')) {
      console.error('Gmail authentication failed. Please check:');
      console.error('1. EMAIL_USER in .env is a valid Gmail address');
      console.error('2. EMAIL_PASS in .env is a valid app password (not your regular password)');
      console.error('3. The Gmail account has 2-factor authentication enabled');
      console.error('4. The app password was generated correctly');
      console.error('5. The app password does not contain spaces (copy-paste without spaces)');
      console.error('6. The app password is exactly 16 characters long');
      console.error('For more information, visit: https://support.google.com/mail/?p=InvalidSecondFactor');
    }
    
    // Don't throw the error, just return a failure result
    // This way the application can continue to work even if email fails
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to company when student applies
 * @param {string} companyEmail - Company's email address
 * @param {string} companyName - Company's name
 * @param {string} studentName - Student's name
 * @param {string} internshipTitle - Internship title
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendApplicationNotificationToCompany = async (
  companyEmail,
  companyName,
  studentName,
  internshipTitle
) => {
  const subject = `New Application for ${internshipTitle}`;
  const text = `Hello ${companyName},

${studentName} has applied for the internship position "${internshipTitle}".

Please log in to your dashboard to review the application.

Best regards,
HinternBridge Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Internship Application</h2>
      <p>Hello <strong>${companyName}</strong>,</p>
      <p><strong>${studentName}</strong> has applied for the internship position <strong>"${internshipTitle}"</strong>.</p>
      <p>Please <a href="#" style="color: #007bff; text-decoration: none;">log in to your dashboard</a> to review the application.</p>
      <br>
      <p>Best regards,<br>
      <strong>HinternBridge Team</strong></p>
    </div>
  `;

  const result = await sendEmail(companyEmail, subject, text, html);
  return result;
};

/**
 * Send notification to student when application status changes
 * @param {string} studentEmail - Student's email address
 * @param {string} studentName - Student's name
 * @param {string} internshipTitle - Internship title
 * @param {string} status - Application status (accepted/rejected)
 * @param {string} companyName - Company's name
 * @returns {Promise} - Promise that resolves when email is sent
 */
export const sendApplicationStatusNotificationToStudent = async (
  studentEmail,
  studentName,
  internshipTitle,
  status,
  companyName
) => {
  const isAccepted = status.toLowerCase() === 'accepted';
  const subject = `Application ${isAccepted ? 'Accepted' : 'Rejected'} for ${internshipTitle}`;
  
  const text = `Hello ${studentName},

Your application for the internship position "${internshipTitle}" at ${companyName} has been ${isAccepted ? 'accepted' : 'rejected'}.

${isAccepted ? 'Congratulations! The company will contact you with further details.' : 'We wish you the best of luck with your future applications.'}

Best regards,
HinternBridge Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Application ${isAccepted ? 'Accepted' : 'Rejected'}</h2>
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>Your application for the internship position <strong>"${internshipTitle}"</strong> at <strong>${companyName}</strong> has been <strong style="${isAccepted ? 'color: #28a745;' : 'color: #dc3545;'}">${status.toLowerCase()}</strong>.</p>
      ${isAccepted ? 
        '<p>Congratulations! The company will contact you with further details.</p>' : 
        '<p>We wish you the best of luck with your future applications.</p>'}
      <br>
      <p>Best regards,<br>
      <strong>HinternBridge Team</strong></p>
    </div>
  `;

  const result = await sendEmail(studentEmail, subject, text, html);
  return result;
};