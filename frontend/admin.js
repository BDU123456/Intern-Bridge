// Admin Dashboard JavaScript
// Use API_BASE to correctly target backend when frontend is served from a different origin (e.g., 5500)
const API_BASE = window.location.port === "5005" ? "" : "http://localhost:5005";

// Global caches for filtering
let STUDENTS_CACHE = [];
let COMPANIES_CACHE = [];
let INTERNSHIPS_CACHE = [];

document.addEventListener("DOMContentLoaded", function () {
  // Check if user is already authenticated
  const token = localStorage.getItem("adminToken");

  if (token) {
    // User is already logged in, show dashboard
    showDashboard();
    loadDashboardData(token);
    setupEventListeners(token);
  } else {
    // Show login form
    showLoginForm();
  }

  // Set up login form event listener
  const loginForm = document.getElementById("admin-login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleAdminLogin);
  }
});

// Function to show login form
function showLoginForm() {
  document.getElementById("admin-login-container").style.display = "flex";
  document.getElementById("admin-dashboard").style.display = "none";
}

// Function to show dashboard
function showDashboard() {
  document.getElementById("admin-login-container").style.display = "none";
  const dashboardEl = document.getElementById("admin-dashboard");
  dashboardEl.style.display = "flex";
  dashboardEl.style.minHeight = "100vh";
  dashboardEl.style.flexDirection = "column";
  const mainEl = dashboardEl.querySelector("main");
  if (mainEl) mainEl.style.flex = "1";

  // Set up navigation functionality
  setupNavigation();

  // Set up logout functionality
  const logoutBtn = document.getElementById("admin-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      logoutAdmin();
    });
  }

  // Load privilege management data
  const token = localStorage.getItem("adminToken");
  if (token) {
    loadSimplifiedPrivilegeManagementData(token);
  }

  // Ensure Total Applications stat tile remains visible
}

// Function to setup navigation
function setupNavigation() {
  // Show dashboard overview by default
  showSection("dashboard");

  // Add event listeners to navigation links
  document.querySelectorAll("nav a").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      // Remove active class from all links
      document
        .querySelectorAll("nav a")
        .forEach((l) => l.classList.remove("active"));

      // Add active class to clicked link
      this.classList.add("active");

      // Show corresponding section
      const href = this.getAttribute("href");
      if (href === "admin.html") {
        showSection("dashboard");
      } else if (href === "#students") {
        showSection("students");
      } else if (href === "#companies") {
        showSection("companies");
      } else if (href === "#internships") {
        showSection("internships");
      } else if (href === "#applications") {
        showSection("applications");
        const t = localStorage.getItem("adminToken");
        if (t) loadApplications(t);
      } else if (href === "#privileges") {
        showSection("privileges");
      }
    });
  });
}

// Function to show specific section
function showSection(sectionName) {
  // Hide all sections
  document
    .querySelectorAll(
      ".dashboard-overview, .profile-section, .internship-section"
    )
    .forEach((section) => {
      section.style.display = "none";
    });

  // Show requested section
  if (sectionName === "dashboard") {
    document.querySelector(".dashboard-overview").style.display = "block";
  } else if (sectionName === "students") {
    document.getElementById("students").style.display = "block";
  } else if (sectionName === "companies") {
    document.getElementById("companies").style.display = "block";
  } else if (sectionName === "internships") {
    document.getElementById("internships").style.display = "block";
  } else if (sectionName === "applications") {
    document.getElementById("applications").style.display = "block";
  } else if (sectionName === "privileges") {
    document.getElementById("privileges").style.display = "block";
  }

  // Toggle footer visibility: only show on dashboard
  const footerEl = document.querySelector("#admin-dashboard footer");
  if (footerEl) {
    footerEl.style.display = sectionName === "dashboard" ? "" : "none";
  }
}

// Function to handle admin login
async function handleAdminLogin(e) {
  e.preventDefault();

  const email = document.getElementById("admin-email").value;
  const password = document.getElementById("admin-password").value;
  const errorMessage = document.getElementById("error-message");

  // Hide previous error messages
  errorMessage.style.display = "none";

  try {
    const response = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      // Store token and user info
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.user));

      // Show dashboard
      showDashboard();
      loadDashboardData(data.token);
      setupEventListeners(data.token);
    } else {
      // Show error message
      errorMessage.textContent = data.message;
      errorMessage.style.display = "block";
    }
  } catch (error) {
    console.error("Login error:", error);
    errorMessage.textContent =
      "An error occurred during login. Please try again.";
    errorMessage.style.display = "block";
  }
}

// Function to setup event listeners
function setupEventListeners(token) {
  // Students
  const studentSearch = document.getElementById("student-search");
  const studentFilter = document.getElementById("student-status-filter");
  if (studentSearch)
    studentSearch.addEventListener("input", applyStudentFilters);
  if (studentFilter)
    studentFilter.addEventListener("change", applyStudentFilters);

  // Companies
  const companySearch = document.getElementById("company-search");
  const companyFilter = document.getElementById("company-status-filter");
  if (companySearch)
    companySearch.addEventListener("input", applyCompanyFilters);
  if (companyFilter)
    companyFilter.addEventListener("change", applyCompanyFilters);

  // Internships
  const internshipSearch = document.getElementById("internship-search");
  const internshipFilter = document.getElementById("internship-status-filter");
  if (internshipSearch)
    internshipSearch.addEventListener("input", applyInternshipFilters);
  if (internshipFilter)
    internshipFilter.addEventListener("change", applyInternshipFilters);
}

// Function to load dashboard data
function loadDashboardData(token) {
  // Show loading state
  showLoadingState();

  // Fetch dashboard statistics
  fetchDashboardStats(token)
    .then((stats) => {
      updateDashboardStats(stats);
      return Promise.all([
        loadStudents(token),
        loadCompanies(token),
        loadInternships(token),
      ]);
    })
    .then(() => {
      hideLoadingState();
    })
    .catch((error) => {
      console.error("Error loading dashboard data:", error);
      hideLoadingState();
      showErrorMessage("Failed to load dashboard data. Please try again.");
    });
}

// Function to fetch dashboard statistics
function fetchDashboardStats(token) {
  return fetch(`${API_BASE}/api/admin/dashboard/stats`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        return data.stats;
      } else {
        throw new Error(data.message || "Failed to fetch dashboard stats");
      }
    });
}

// Function to update dashboard statistics
function updateDashboardStats(stats) {
  document.getElementById("total-students").textContent =
    stats.totalStudents || 0;
  document.getElementById("total-companies").textContent =
    stats.totalCompanies || 0;
  document.getElementById("total-internships").textContent =
    stats.totalInternships || 0;
  const totalAppsEl = document.getElementById("total-applications");
  if (totalAppsEl) totalAppsEl.textContent = stats.totalApplications || 0;
}

// Function to load students
function loadStudents(token) {
  return fetch(`${API_BASE}/api/admin/students`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        STUDENTS_CACHE = data.students || [];
        applyStudentFilters();
      } else {
        throw new Error(data.message || "Failed to load students");
      }
    });
}

// Function to render students
function renderStudents(students) {
  const studentsList = document.getElementById("students-list");

  if (!students || students.length === 0) {
    studentsList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-users"></i>
                <p>No students found.</p>
            </div>
        `;
    return;
  }

  let tableHTML = `
        <div class="table-container">
            <table class="internships-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>University</th>
                        <th>Phone</th>
                        <th>Resume</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

  students.forEach((student) => {
    const isApproved = !!student.approved;
    const statusBadge = isApproved
      ? '<span class="status-badge approved">Approved</span>'
      : '<span class="status-badge pending">Waiting</span>';
    const actions = isApproved
      ? '<button class="btn btn-danger btn-sm reject-student"><i class="fas fa-times"></i> Reject</button>'
      : '<button class="btn btn-success btn-sm approve-student"><i class="fas fa-check"></i> Approve</button> <button class="btn btn-danger btn-sm reject-student"><i class="fas fa-times"></i> Reject</button>';

    tableHTML += `
            <tr data-student-id="${student.id}">
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.university || "N/A"}</td>
                <td>${student.phone || "N/A"}</td>
                <td>
                    ${
                      student.resume
                        ? `<a href="${API_BASE}/api/uploads/${student.resume}" target="_blank" class="btn btn-info btn-sm">
                            <i class="fas fa-file-pdf"></i> View
                        </a>`
                        : "No Resume"
                    }
                </td>
                <td>${statusBadge}</td>
                <td class="actions-cell">${actions}</td>
            </tr>
        `;
  });

  tableHTML += `
                </tbody>
            </table>
        </div>
    `;

  studentsList.innerHTML = tableHTML;

  // Actions
  document.querySelectorAll(".approve-student").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = this.closest("tr").dataset.studentId;
      approveStudent(id);
    });
  });
  document.querySelectorAll(".reject-student").forEach((button) => {
    button.addEventListener("click", function () {
      const studentRow = this.closest("tr");
      const studentId = studentRow.dataset.studentId;
      rejectStudent(studentId);
    });
  });
}

// Function to approve a student
function approveStudent(studentId) {
  if (!confirm("Are you sure you want to approve this student?")) {
    return;
  }

  // Get token from localStorage
  const token = localStorage.getItem("adminToken");

  fetch(`${API_BASE}/api/admin/students/${studentId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showSuccessMessage("Student approved successfully");
        // Reload students list
        loadStudents(token);
      } else {
        throw new Error(data.message || "Failed to approve student");
      }
    })
    .catch((error) => {
      console.error("Error approving student:", error);
      showErrorMessage("Failed to approve student. Please try again.");
    });
}

// Function to reject a student
function rejectStudent(studentId) {
  if (
    !confirm(
      "Are you sure you want to reject and remove this student? This action cannot be undone."
    )
  ) {
    return;
  }

  // Get token from localStorage
  const token = localStorage.getItem("adminToken");

  fetch(`${API_BASE}/api/admin/students/${studentId}/reject`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showSuccessMessage("Student rejected and removed successfully");
        // Reload students list
        loadStudents(token);
      } else {
        throw new Error(data.message || "Failed to reject student");
      }
    })
    .catch((error) => {
      console.error("Error rejecting student:", error);
      showErrorMessage("Failed to reject student. Please try again.");
    });
}

// Function to load companies
function loadCompanies(token) {
  return fetch(`${API_BASE}/api/admin/companies`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        COMPANIES_CACHE = data.companies || [];
        applyCompanyFilters();
      } else {
        throw new Error(data.message || "Failed to load companies");
      }
    });
}

// Function to render companies
function renderCompanies(companies) {
  const companiesList = document.getElementById("companies-list");

  if (!companies || companies.length === 0) {
    companiesList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-building"></i>
                <p>No companies found.</p>
            </div>
        `;
    return;
  }

  let tableHTML = `
        <div class="table-container">
            <table class="internships-table">
                <thead>
                    <tr>
                        <th>Company Name</th>
                        <th>Email</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

  companies.forEach((company) => {
    const isApproved = !!company.approved;
    const statusBadge = isApproved
      ? '<span class="status-badge approved">Approved</span>'
      : '<span class="status-badge pending">Waiting</span>';
    const actions = isApproved
      ? '<button class="btn btn-danger btn-sm remove-company"><i class="fas fa-times"></i> Reject</button>'
      : '<button class="btn btn-success btn-sm approve-company"><i class="fas fa-check"></i> Approve</button> <button class="btn btn-danger btn-sm remove-company"><i class="fas fa-times"></i> Reject</button>';

    tableHTML += `
            <tr data-company-id="${company.id}">
                <td>${company.name}</td>
                <td>${company.email}</td>
                <td>${company.address || "Not provided"}</td>
                <td>${statusBadge}</td>
                <td class="actions-cell">${actions}</td>
            </tr>
        `;
  });

  tableHTML += `
                </tbody>
            </table>
        </div>
    `;

  companiesList.innerHTML = tableHTML;

  // Actions
  document.querySelectorAll(".approve-company").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = this.closest("tr").dataset.companyId;
      approveCompany(id);
    });
  });
  document.querySelectorAll(".remove-company").forEach((button) => {
    button.addEventListener("click", function () {
      const companyRow = this.closest("tr");
      const companyId = companyRow.dataset.companyId;
      removeCompany(companyId);
    });
  });
}

// Function to approve a company
function approveCompany(companyId) {
  if (!confirm("Are you sure you want to approve this company?")) {
    return;
  }

  // Get token from localStorage
  const token = localStorage.getItem("adminToken");

  fetch(`${API_BASE}/api/admin/companies/${companyId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showSuccessMessage("Company approved successfully");
        // Reload companies list
        loadCompanies(token);
      } else {
        throw new Error(data.message || "Failed to approve company");
      }
    })
    .catch((error) => {
      console.error("Error approving company:", error);
      showErrorMessage("Failed to approve company. Please try again.");
    });
}

// Function to remove a company
function removeCompany(companyId) {
  if (
    !confirm(
      "Are you sure you want to remove this company? This action cannot be undone."
    )
  ) {
    return;
  }

  // Get token from localStorage
  const token = localStorage.getItem("adminToken");

  fetch(`${API_BASE}/api/admin/companies/${companyId}/remove`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showSuccessMessage("Company removed successfully");
        // Reload companies list
        loadCompanies(token);
      } else {
        throw new Error(data.message || "Failed to remove company");
      }
    })
    .catch((error) => {
      console.error("Error removing company:", error);
      showErrorMessage("Failed to remove company. Please try again.");
    });
}

// Function to show loading state
function showLoadingState() {
  // Add loading indicators to sections
  document
    .querySelectorAll(".students-list, .companies-list, .internship-list")
    .forEach((section) => {
      section.innerHTML = '<div class="loading">Loading...</div>';
    });
}

// Function to hide loading state
function hideLoadingState() {
  // Remove loading indicators
  document.querySelectorAll(".loading").forEach((loader) => {
    loader.remove();
  });
}

// Function to show success message
function showSuccessMessage(message) {
  // In a real implementation, you would show a toast or notification
  alert("Success: " + message);
}

// Function to show error message
function showErrorMessage(message) {
  // In a real implementation, you would show a toast or notification
  alert("Error: " + message);
}

// Function to load internships
function loadInternships(token) {
  return fetch(`${API_BASE}/api/admin/internships`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        INTERNSHIPS_CACHE = data.internships || [];
        applyInternshipFilters();
      } else {
        throw new Error(data.message || "Failed to load internships");
      }
    });
}

// Function to render internships
function renderInternships(internships) {
  const internshipsList = document.getElementById("internships-list");

  if (!internships || internships.length === 0) {
    internshipsList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-briefcase"></i>
                <p>No internships found.</p>
            </div>
        `;
    return;
  }

  let tableHTML = `
        <div class="table-container">
            <table class="internships-table">
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Company</th>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Duration</th>
                        <th>Description</th>
                        <th>Skills</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

  internships.forEach((internship) => {
    const statusBadge =
      internship.status === "active"
        ? '<span class="status-badge approved">Approved</span>'
        : '<span class="status-badge pending">Waiting</span>';

    tableHTML += `
            <tr data-internship-id="${internship.id}">
                <td>${internship.title || "N/A"}</td>
                <td>${internship.company_name || "Unknown Company"}</td>
                <td>${internship.type || "Not specified"}</td>
                <td>${internship.location || "Not specified"}</td>
                <td>${internship.duration || "Not specified"}</td>
                <td class="description-cell">${
                  internship.description || "No description provided"
                }</td>
                <td>${internship.skills || "Not specified"}</td>
                <td>${statusBadge}</td>
                <td class="actions-cell">
                    ${
                      internship.status === "active"
                        ? '<button class="btn btn-danger btn-sm reject-internship">Reject</button>'
                        : '<button class="btn btn-success btn-sm approve-internship">Approve</button> <button class="btn btn-danger btn-sm reject-internship">Reject</button>'
                    }
                </td>
            </tr>
        `;
  });

  tableHTML += `
                </tbody>
            </table>
        </div>
    `;

  internshipsList.innerHTML = tableHTML;

  // Add event listeners to action buttons
  document.querySelectorAll(".approve-internship").forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const internshipId = row.dataset.internshipId;
      approveInternship(internshipId);
    });
  });

  document.querySelectorAll(".reject-internship").forEach((button) => {
    button.addEventListener("click", function () {
      const row = this.closest("tr");
      const internshipId = row.dataset.internshipId;
      rejectInternship(internshipId);
    });
  });
}

// Filtering helpers
function applyStudentFilters() {
  const q = (
    document.getElementById("student-search")?.value || ""
  ).toLowerCase();
  const status =
    document.getElementById("student-status-filter")?.value || "all";
  const filtered = (STUDENTS_CACHE || []).filter((s) => {
    const matchesQ = [s.name, s.email, s.university].some((v) =>
      (v || "").toLowerCase().includes(q)
    );
    let matchesStatus = true;
    if (status === "approved") matchesStatus = !!s.approved;
    else if (status === "waiting") matchesStatus = !s.approved;
    return matchesQ && matchesStatus;
  });
  renderStudents(filtered);
}

function applyCompanyFilters() {
  const q = (
    document.getElementById("company-search")?.value || ""
  ).toLowerCase();
  const status =
    document.getElementById("company-status-filter")?.value || "all";
  const filtered = (COMPANIES_CACHE || []).filter((c) => {
    const matchesQ = [c.name, c.email, c.address, c.about].some((v) =>
      (v || "").toLowerCase().includes(q)
    );
    let matchesStatus = true;
    if (status === "approved") matchesStatus = !!c.approved;
    else if (status === "waiting") matchesStatus = !c.approved;
    return matchesQ && matchesStatus;
  });
  renderCompanies(filtered);
}

function applyInternshipFilters() {
  const q = (
    document.getElementById("internship-search")?.value || ""
  ).toLowerCase();
  const status =
    document.getElementById("internship-status-filter")?.value || "all";
  const filtered = (INTERNSHIPS_CACHE || []).filter((i) => {
    const matchesQ = [
      i.title,
      i.company_name,
      i.type,
      i.location,
      i.skills,
    ].some((v) => (v || "").toLowerCase().includes(q));
    let matchesStatus = true;
    const isApproved = i.status === "active";
    if (status === "approved") matchesStatus = isApproved;
    else if (status === "waiting") matchesStatus = !isApproved;
    return matchesQ && matchesStatus;
  });
  renderInternships(filtered);
}

// Function to approve an internship
function approveInternship(internshipId) {
  if (!confirm("Are you sure you want to approve this internship?")) {
    return;
  }

  const token = localStorage.getItem("adminToken");

  fetch(`${API_BASE}/api/admin/internships/${internshipId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showSuccessMessage("Internship approved successfully");
        loadInternships(token);
      } else {
        throw new Error(data.message || "Failed to approve internship");
      }
    })
    .catch((error) => {
      console.error("Error approving internship:", error);
      showErrorMessage("Failed to approve internship. Please try again.");
    });
}

// Function to reject an internship
function rejectInternship(internshipId) {
  if (!confirm("Are you sure you want to reject this internship?")) {
    return;
  }

  const token = localStorage.getItem("adminToken");

  fetch(`${API_BASE}/api/admin/internships/${internshipId}/reject`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showSuccessMessage("Internship rejected successfully");
        loadInternships(token);
      } else {
        throw new Error(data.message || "Failed to reject internship");
      }
    })
    .catch((error) => {
      console.error("Error rejecting internship:", error);
      showErrorMessage("Failed to reject internship. Please try again.");
    });
}

// Applications Management
function loadApplications(token) {
  const tbody = document.getElementById("applications-table-body");
  if (tbody) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="loading">Loading applications...</td></tr>';
  }
  return fetch(`${API_BASE}/api/admin/applications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        renderApplications(data.applications, token);
      } else {
        throw new Error(data.message || "Failed to load applications");
      }
    })
    .catch((err) => {
      console.error("Error loading applications:", err);
      if (tbody)
        tbody.innerHTML =
          '<tr><td colspan="5" class="no-results">Failed to load applications</td></tr>';
    });
}

function renderApplications(applications, token) {
  const tbody = document.getElementById("applications-table-body");
  if (!tbody) return;

  if (!applications || applications.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="no-results">No applications found.</td></tr>';
    return;
  }

  const rows = applications
    .map((app) => {
      const status = app.status || "pending";
      let actions = [];
      // Only show Approve button for non-finalized states
      if (status !== "accepted" && status !== "rejected") {
        actions.push(
          `<button class="btn btn-success btn-sm approve-application" data-app-id="${app.applicationId}"><i class="fas fa-check"></i> Approve</button>`
        );
      }
      return `
            <tr data-application-id="${app.applicationId}">
                <td>${app.studentName} <br><small>${
        app.studentEmail
      }</small></td>
                <td>${app.companyName} <br><small>${
        app.companyEmail
      }</small></td>
                <td>${app.internship_title}</td>
                <td>${status}</td>
                <td class="actions-cell">${actions.join(" ")}</td>
            </tr>
        `;
    })
    .join("");

  tbody.innerHTML = rows;

  document.querySelectorAll(".approve-application").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = this.getAttribute("data-app-id");
      approveApplication(id, token);
    });
  });

  // Removed send-payment handlers
}

function approveApplication(applicationId, token) {
  if (!confirm("Approve this application and notify parties?")) return;
  fetch(`${API_BASE}/api/admin/applications/${applicationId}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.success) {
        showSuccessMessage("Application approved");
        loadApplications(token);
      } else {
        throw new Error(data.message || "Failed to approve application");
      }
    })
    .catch((err) => {
      console.error("Approve application error:", err);
      showErrorMessage("Failed to approve application.");
    });
}

// Removed sendPayment function

// Function to logout admin
function logoutAdmin() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  showLoginForm();
}

// Simplified Privilege Management Functions

// Load simplified privilege management data
function loadSimplifiedPrivilegeManagementData(token) {
  loadAvailablePrivileges(token);
  loadGrantedPrivileges(token);

  // Set up event listener for grant privilege button
  const grantBtn = document.getElementById("grant-privilege-btn");
  if (grantBtn) {
    grantBtn.addEventListener("click", function (e) {
      e.preventDefault();
      grantPrivilegeByEmail(token);
    });
  }
}

// Load available privileges for the dropdown
function loadAvailablePrivileges(token) {
  const privilegeSelect = document.getElementById("privilege-select");
  if (!privilegeSelect) return;
  // Populate fixed privilege groups as requested
  privilegeSelect.innerHTML =
    '<option value="">Select privileges</option>' +
    '<option value="all_management">All Management</option>' +
    '<option value="student_management">Student Management</option>' +
    '<option value="company_management">Company Management</option>' +
    '<option value="internship_management">Internship Management</option>';
}

// Load granted privileges
function loadGrantedPrivileges(token) {
  fetch(`${API_BASE}/api/admin/users/privileges`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        renderGrantedPrivileges(data.users, token);
      } else {
        throw new Error(data.message || "Failed to load granted privileges");
      }
    })
    .catch((error) => {
      console.error("Error loading granted privileges:", error);
      showErrorMessage("Failed to load granted privileges. Please try again.");
    });
}

// Render granted privileges
function renderGrantedPrivileges(users, token) {
  const tableBody = document.getElementById("granted-privileges-table-body");

  if (!tableBody) return;

  if (!users || users.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="no-results">
                    <i class="fas fa-users"></i>
                    <p>No granted privileges found.</p>
                </td>
            </tr>
        `;
    return;
  }

  let tableHTML = "";

  users.forEach((user) => {
    if (user.privileges && user.privileges.length > 0) {
      user.privileges.forEach((privilege) => {
        tableHTML += `
                    <tr>
                        <td>${user.email}</td>
                        <td>${privilege}</td>
                        <td>Admin</td>
                        <td class="actions-cell">
                            <button class="btn btn-danger btn-sm revoke-privilege"
                                    data-user-id="${user.id}"
                                    data-privilege="${privilege}">
                                <i class="fas fa-times"></i> Revoke
                            </button>
                        </td>
                    </tr>
                `;
      });
    }
  });

  tableBody.innerHTML = tableHTML;

  // Add event listeners to revoke buttons
  document.querySelectorAll(".revoke-privilege").forEach((button) => {
    button.addEventListener("click", function () {
      const userId = this.getAttribute("data-user-id");
      const privilegeName = this.getAttribute("data-privilege");
      revokeUserPrivilege(userId, privilegeName, token);
    });
  });
}

// Grant privilege by email
function grantPrivilegeByEmail(token) {
  const userEmail = document.getElementById("user-email").value.trim();
  const selection = document.getElementById("privilege-select").value;
  const grantBtn = document.getElementById("grant-privilege-btn");

  if (!userEmail || !selection) {
    showErrorMessage("Please enter both user email and select privileges");
    if (grantBtn) {
      grantBtn.disabled = false;
      grantBtn.textContent = "Grant Privilege";
    }
    return;
  }

  if (grantBtn) {
    grantBtn.disabled = true;
    grantBtn.textContent = "Granting...";
  }

  // Map selection to actual privilege list
  const selectionMap = {
    all_management: [
      "manage_students",
      "manage_companies",
      "manage_internships",
    ],
    student_management: ["manage_students"],
    company_management: ["manage_companies"],
    internship_management: ["manage_internships"],
  };

  const privilegesToGrant = selectionMap[selection];
  if (!privilegesToGrant || privilegesToGrant.length === 0) {
    showErrorMessage("Invalid privilege selection");
    if (grantBtn) {
      grantBtn.disabled = false;
      grantBtn.textContent = "Grant Privilege";
    }
    return;
  }

  // First, find the user by email
  fetch(`${API_BASE}/api/admin/users/email/${encodeURIComponent(userEmail)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => response.json())
    .then(async (data) => {
      let userId;
      if (data.success && data.user) {
        userId = data.user.id;
        // Grant each privilege sequentially
        return privilegesToGrant.reduce((promise, privilegeName) => {
          return promise.then(() => {
            return fetch(`${API_BASE}/api/admin/users/${userId}/privileges`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ privilegeName }),
            })
              .then((res) => res.json())
              .then((resp) => {
                if (!resp.success) {
                  throw new Error(
                    resp.message || `Failed to grant '${privilegeName}'`
                  );
                }
              });
          });
        }, Promise.resolve());
      } else {
        // User not found: prompt to create
        const name = prompt(
          "User not found. Enter full name to create a new user:"
        );
        if (!name) throw new Error("User creation cancelled");
        const password = prompt("Enter a temporary password for the new user:");
        if (!password) throw new Error("User creation cancelled");
        // Create user and grant first privilege
        const createResp = await fetch(
          `${API_BASE}/api/admin/users/privileges`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              privilegeName: privilegesToGrant[0],
              createIfNotExists: true,
              newUser: {
                name,
                email: userEmail,
                password,
                role: "privileged_admin",
              },
            }),
          }
        ).then((r) => r.json());
        if (!createResp.success || !createResp.userId) {
          throw new Error(
            createResp.message || "Failed to create user and grant privilege"
          );
        }
        userId = createResp.userId;
        // Grant remaining privileges if any
        if (privilegesToGrant.length > 1) {
          await privilegesToGrant.slice(1).reduce((promise, privilegeName) => {
            return promise.then(() => {
              return fetch(`${API_BASE}/api/admin/users/${userId}/privileges`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ privilegeName }),
              })
                .then((res) => res.json())
                .then((resp) => {
                  if (!resp.success) {
                    throw new Error(
                      resp.message || `Failed to grant '${privilegeName}'`
                    );
                  }
                });
            });
          }, Promise.resolve());
        }
      }
    })
    .then(() => {
      showSuccessMessage(`Privileges granted successfully to ${userEmail}`);
      // Clear the form
      document.getElementById("user-email").value = "";
      document.getElementById("privilege-select").value = "";
      // Reload the granted privileges list
      loadGrantedPrivileges(token);
    })
    .catch((error) => {
      console.error("Error granting privilege:", error);
      showErrorMessage(
        error.message || "Failed to grant privilege. Please try again."
      );
    })
    .finally(() => {
      if (grantBtn) {
        grantBtn.disabled = false;
        grantBtn.textContent = "Grant Privilege";
      }
    });
}

// Revoke user privilege
function revokeUserPrivilege(userId, privilegeName, token) {
  if (
    !confirm(
      `Are you sure you want to revoke the '${privilegeName}' privilege from this user?`
    )
  ) {
    return;
  }

  fetch(`${API_BASE}/api/admin/users/${userId}/privileges`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ privilegeName }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        showSuccessMessage(`Privilege '${privilegeName}' revoked successfully`);
        // Reload the granted privileges list
        loadGrantedPrivileges(token);
      } else {
        throw new Error(data.message || "Failed to revoke privilege");
      }
    })
    .catch((error) => {
      console.error("Error revoking privilege:", error);
      showErrorMessage("Failed to revoke privilege. Please try again.");
    });
}
