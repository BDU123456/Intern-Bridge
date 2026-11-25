import { sendEmail } from "./emailService.js";

export const sendApplicationDetailsToCompany = async ({
  companyEmail,
  companyName,
  internshipTitle,
  studentName,
  studentEmail,
  studentPhone,
  education = [],
  skills = [],
  projects = [],
  resume = null,
}) => {
  const subject = `New Application for ${internshipTitle} - ${studentName}`;
  const esc = (s) => (s || "").toString();
  const eduHtml = education.length
    ? `<ul>${education
        .map(
          (e) => `<li>${esc(e.institution || "")} - ${esc(e.degree || "")}</li>`
        )
        .join("")}</ul>`
    : "<p>No education records.</p>";
  const skillsHtml = skills.length
    ? `<p>${skills.map(esc).join(", ")}</p>`
    : "<p>No skills provided.</p>";
  const projectsHtml = projects.length
    ? `<ul>${projects
        .map(
          (p) =>
            `<li><strong>${esc(p.title || "")}:</strong> ${esc(
              p.description || ""
            )}</li>`
        )
        .join("")}</ul>`
    : "<p>No projects listed.</p>";
  const resumeHtml = resume
    ? "<p>Log in to your company dashboard to view this applicant's resume.</p>"
    : "<p>No resume uploaded.</p>";

  const text =
    `Hello ${companyName},\n\n` +
    `${studentName} has applied for "${internshipTitle}".\n` +
    `Education: ${education
      .map((e) => `${e.institution || ""} - ${e.degree || ""}`)
      .join("; ")}\n` +
    `Skills: ${skills.join(", ")}\n` +
    `Projects: ${projects
      .map((p) => `${p.title || ""}: ${p.description || ""}`)
      .join("; ")}\n` +
    `Resume: ${resume ? "Log in to your company dashboard to view this resume" : "No resume"}\n\n` +
    `Please log in to your dashboard and click "Ready to Accept" on this applicant if you want to proceed. You can contact the student via email or phone for any follow-up.\n\n` +
    `Best regards,\nHinternBridge Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color:#333">New Internship Application</h2>
      <p>Hello <strong>${companyName}</strong>,</p>
      <p>The student <strong>${studentName}</strong> has applied for <strong>${internshipTitle}</strong>.</p>
      <h3>Candidate Profile</h3>
      <h4>Education</h4>
      ${eduHtml}
      <h4>Skills</h4>
      ${skillsHtml}
      <h4>Projects</h4>
      ${projectsHtml}
      ${resumeHtml}
      <hr>
      <p>If you are ready to accept this candidate, please log into your company dashboard and click <strong>"Ready to Accept"</strong> on the applicant.</p>
      <p>Best regards,<br>HinternBridge Team</p>
    </div>
  `;

  return sendEmail(companyEmail, subject, text, html);
};

export const sendPaymentRequestToStudent = async ({
  studentEmail,
  studentName,
  internshipTitle,
  companyName,
  amount,
  paymentLink,
}) => {
  const subject = `Payment Instructions to Confirm Acceptance for ${internshipTitle}`;
  const text =
    `Hello ${studentName},\n\n` +
    `The company ${companyName} is ready to accept you for ${internshipTitle}.\n` +
    `To proceed, please complete the payment of ${amount} by 0980539255 (Zemenu Abebaw) through Telebirr.\n\n` +
    `After payment is verified by admin, the company will finalize your acceptance.\n\n` +
    `After payment completion, send a screenshot through [@zeda_ab](https://t.me/zeda_ab)\n\n` +
    `Best regards,\nHinternBridge Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color:#333">Payment Instructions</h2>
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>The company <strong>${companyName}</strong> is ready to accept you for <strong>${internshipTitle}</strong>.</p>
      <p>Please complete the payment of <strong>${amount}</strong> by 0980539255 (Zemenu Abebaw) through Telebirr.</p>
      <p>After payment is verified by admin, the company will finalize your acceptance.</p>
      <p> After payment completion, send a screenshot through [@zeda_ab](https://t.me/zeda_ab)</p>
      <p>Best regards,<br>HinternBridge Team</p>
    </div>
  `;
  return sendEmail(studentEmail, subject, text, html);
};

export const sendPaymentReceivedNotificationToCompany = async ({
  companyEmail,
  companyName,
  internshipTitle,
  studentName,
}) => {
  const subject = `Payment Received - Finalize Acceptance for ${internshipTitle}`;
  const text =
    `Hello ${companyName},\n\n` +
    `Payment from ${studentName} has been received for ${internshipTitle}.\n` +
    `Please log in to your dashboard and click 'Accept' to finalize the application.\n\n` +
    `Best regards,\nHinternBridge Team`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color:#333">Payment Received</h2>
      <p>Hello <strong>${companyName}</strong>,</p>
      <p>Payment from <strong>${studentName}</strong> has been received for <strong>${internshipTitle}</strong>.</p>
      <p>Please log in to your dashboard and click <strong>Accept</strong> to finalize the application.</p>
      <p>Best regards,<br>HinternBridge Team</p>
    </div>
  `;
  return sendEmail(companyEmail, subject, text, html);
};
