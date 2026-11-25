document.addEventListener("DOMContentLoaded", () => {
    // API Configuration
    const API_BASE_URL = "/api";

    document.addEventListener("click", async (event) => {
        const link = event.target.closest("[data-resume-file]");
        if (!link) return;
        event.preventDefault();

        const resumeWindow = window.open("about:blank", "_blank");
        if (!resumeWindow) return;

        try {
            const fileName = encodeURIComponent(link.dataset.resumeFile);
            const response = await fetch(`${API_BASE_URL}/student/resume/${fileName}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            if (!response.ok) throw new Error("Resume request failed");

            const fileUrl = URL.createObjectURL(await response.blob());
            resumeWindow.location = fileUrl;
            setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
        } catch (error) {
            resumeWindow.close();
            alert("Could not open this resume.");
        }
    });
    let currentUser = null;
    // Map of internshipId -> application status for the logged-in student
    let studentApplicationStatus = {};
    // Cache for company internships to apply type filters
    let companyInternshipsCache = [];
    let studentInternshipsCache = [];
    // Standard internship type options
    const INTERNSHIP_TYPES = [
        'Web Development',
        'Mobile Development',
        'Networking',
        'Data Science',
        'UI/UX Design'
    ];

    // Load Google Sign-In library and initialize
    function loadGoogleSignIn() {
        console.log('Loading Google Sign-In library...');
        // Check if the Google Sign-In library is already loaded
        if (typeof google !== 'undefined' && google.accounts) {
            console.log('Google Sign-In library already loaded');
            initializeGoogleSignIn();
            return;
        }
        
        // Load the Google Sign-In library
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            console.log('Google Sign-In library loaded successfully');
            // Wait for the library to be fully initialized
            checkGoogleLibraryReady();
        };
        script.onerror = () => {
            console.error('Failed to load Google Sign-In library');
            showGoogleSignInError('Failed to load Google Sign-In library');
        };
        document.head.appendChild(script);
    }

    // Check if Google Sign-In library is ready
    function checkGoogleLibraryReady() {
        if (typeof google !== 'undefined' && google.accounts) {
            console.log('Google Sign-In library is ready');
            initializeGoogleSignIn();
        } else {
            console.log('Waiting for Google Sign-In library to be ready...');
            setTimeout(checkGoogleLibraryReady, 100);
        }
    }

    // Show error message for Google Sign-In
    function showGoogleSignInError(message) {
        const errorDiv = document.getElementById('google-login-error');
        const registerErrorDiv = document.getElementById('google-register-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
        if (registerErrorDiv) {
            registerErrorDiv.textContent = message;
            registerErrorDiv.style.display = 'block';
        }
    }

    // Google Sign-In initialization
    function initializeGoogleSignIn() {
        console.log('Initializing Google Sign-In...');
        // Hide any previous error messages
        const errorDiv = document.getElementById('google-login-error');
        const registerErrorDiv = document.getElementById('google-register-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
        if (registerErrorDiv) {
            registerErrorDiv.style.display = 'none';
        }
        
        // Check if google.accounts is available
        if (typeof google === 'undefined' || !google.accounts) {
            console.error('Google Sign-In library not loaded');
            showGoogleSignInError('Google Sign-In library not loaded');
            return;
        }

        try {
            // Initialize Google Sign-In
            google.accounts.id.initialize({
                client_id: "313987830115-tjb41pc20g8rqtdsfle9f6kin1m4ji3d.apps.googleusercontent.com",
                callback: handleGoogleLogin
            });

            // Render Google Sign-In button for login
            const loginButton = document.getElementById("google-login-button");
            if (loginButton) {
                console.log('Rendering Google Sign-In button for login...');
                console.log('Login button element:', loginButton);
                google.accounts.id.renderButton(
                    loginButton,
                    { theme: "outline", size: "large", width: 200, text: "signin_with" }
                );
                console.log('Google Sign-In button rendered for login');
                // Check if button was actually rendered
                setTimeout(() => {
                    console.log('Login button innerHTML after render:', loginButton.innerHTML);
                }, 100);
            } else {
                console.error('Google login button element not found');
                showGoogleSignInError('Google login button element not found');
            }

            // Render Google Sign-In button for register
            const registerButton = document.getElementById("google-register-button");
            if (registerButton) {
                console.log('Rendering Google Sign-In button for register...');
                console.log('Register button element:', registerButton);
                google.accounts.id.renderButton(
                    registerButton,
                    { theme: "outline", size: "large", width: 200, text: "signup_with" }
                );
                console.log('Google Sign-In button rendered for register');
                // Check if button was actually rendered
                setTimeout(() => {
                    console.log('Register button innerHTML after render:', registerButton.innerHTML);
                }, 100);
            } else {
                console.error('Google register button element not found');
                showGoogleSignInError('Google register button element not found');
            }
        } catch (error) {
            console.error('Error initializing Google Sign-In:', error);
            showGoogleSignInError('Error initializing Google Sign-In: ' + error.message);
        }
    }

    // Handle Google Sign-In response
    async function handleGoogleLogin(response) {
        console.log('Google Sign-In response received:', response);
        try {
            const data = await apiRequest("/auth/google-login", "POST", {
                tokenId: response.credential
            });

            const { token, user } = data;
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
            localStorage.setItem("token", token);
            currentUser = user;
            authContainer.classList.add("hidden");
            resetAuthFormInputs();

            if (user.role === "privileged_admin") {
                window.location.href = "admin.html";
            } else if (user.role === "student") {
                studentContainer.classList.remove("hidden");
                const profile = await getStudentProfile();
                renderPortfolioDisplay(profile);
                await loadGeneralInformation();
                showSection("dashboard-section");
            } else if (user.role === "company") {
                companyContainer.classList.remove("hidden");
                await renderCompanyDashboard();
                const internships = await getCompanyInternships();
                companyInternshipsCache = internships;
                ensureCompanyTypeFilterUI();
                filterCompanyInternships();
                const applicants = await getApplicants();
                displayApplicants(applicants);
                showSection("company-dashboard-section");
            } else {
                window.location.href = "home.html";
            }
        } catch (error) {
            alert("Google Sign-In failed: " + error.message);
        }
    }

    // --- DOM Elements ---
    const authContainer = document.getElementById("auth-container");
    const studentContainer = document.getElementById("student-container");
    const companyContainer = document.getElementById("company-container");
    
    // Forgot Password Modal Elements
    const forgotPasswordModal = document.getElementById("forgot-password-modal");
    const forgotPasswordLink = document.getElementById("forgot-password-link");
    const closeModal = document.querySelector(".close-modal");
    const sendResetCodeBtn = document.getElementById("send-reset-code-btn");
    const verifyCodeBtn = document.getElementById("verify-code-btn");
    const resetPasswordBtn = document.getElementById("reset-password-btn");
    const resendCodeLink = document.getElementById("resend-code-link");
    
    // Forgot Password Variables
    let resetEmail = "";
    let countdownInterval;

    // Auth elements
    const loginTab = document.getElementById("login-tab");
    const registerTab = document.getElementById("register-tab");
    const roleSelect = document.getElementById("role-select");

    const loginForm = document.getElementById("login-form");
    const studentRegisterForm = document.getElementById("student-register-form");
    const companyRegisterForm = document.getElementById("company-register-form");

    const switchToRegisterLink = document.getElementById("switch-to-register");
    const switchToLoginLink = document.getElementById("switch-to-login");
    const switchToLoginCompanyLink = document.getElementById("switch-to-login-company");

    const loginBtn = document.getElementById("login-btn");
    const studentRegisterBtn = document.getElementById("student-register-btn");
    const companyRegisterBtn = document.getElementById("company-register-btn");

    const studentLogoutBtn = document.getElementById("student-logout-btn");
    const companyLogoutBtn = document.getElementById("company-logout-btn");

    // Student Dashboard
    const studentNavLinks = document.querySelectorAll("#student-container .nav-link");
    const studentDisplayName = document.getElementById("student-display-name");
    const internshipList = document.getElementById("internship-list");
    const browseInternshipList = document.getElementById("browse-internship-list");

    // Company Dashboard
    const companyNavLinks = document.querySelectorAll("#company-container .nav-link");
    const companyDisplayName = document.getElementById("company-display-name");
    const companyInternshipList = document.getElementById("company-internship-list");
    const applicantsList = document.getElementById("applicants-list");

    // --- Helper Functions ---
    function showSection(sectionId) {
        document.querySelectorAll('.student-main-content, .company-main-content').forEach(section => {
            section.classList.add('hidden');
        });
        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.remove('hidden');
    }

    function switchAuthForm(formToShow) {
        loginForm.classList.add('hidden');
        studentRegisterForm.classList.add('hidden');
        companyRegisterForm.classList.add('hidden');
        formToShow.classList.remove('hidden');
    }

    function setActiveTab(activeButton) {
        loginTab.classList.remove('active');
        registerTab.classList.remove('active');
        activeButton.classList.add('active');
    }

    function resetAuthFormInputs() {
        loginForm.reset();
        studentRegisterForm.reset();
        companyRegisterForm.reset();
    }

    async function apiRequest(url, method, body = null, auth = false) {
        const headers = { "Content-Type": "application/json" };
        if (auth) {
            const token = localStorage.getItem("token");
            if (token) headers["Authorization"] = `Bearer ${token}`;
        }
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : null
            });
            const contentType = response.headers.get("content-type");
            if (!contentType.includes("application/json")) {
                const text = await response.text();
                throw new Error(`Invalid response: ${text.slice(0, 100)}`);
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Request failed");
            }
            return data;
        } catch (error) {
            console.error("API Error:", error);
            throw error;
        }
    }

    // Auth API
    async function login(email, password) {
        return apiRequest("/auth/login", "POST", { email, password });
    }
    async function registerStudent(data) {
        return apiRequest("/auth/register/student", "POST", data);
    }
    async function registerCompany(data) {
        return apiRequest("/auth/register/company", "POST", data);
    }

    // Student API
    async function getStudentProfile() {
        return apiRequest("/student/profile", "GET", null, true);
    }
    async function updateStudentProfile(profileData) {
        return apiRequest("/student/profile", "PUT", profileData, true);
    }
    async function updatePortfolio(portfolioData) {
        return apiRequest("/student/portfolio", "PUT", portfolioData, true);
    }
    async function uploadResume(file) {
        const formData = new FormData();
        formData.append("resume", file);
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE_URL}/student/portfolio/resume`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Upload failed");
        }
        return response.json();
    }

    // Internship API
    async function getInternships(filters = {}) {
        const query = new URLSearchParams(filters).toString();
        const response = await apiRequest(`/internships?${query}`, "GET");
        return response.internships || response; // Handle different response formats
    }
    async function applyForInternship(internshipId) {
        return apiRequest(`/internships/${internshipId}/apply`, "POST", null, true);
    }
    async function createInternship(internshipData) {
        return apiRequest("/company/internships", "POST", internshipData, true);
    }
    async function getCompanyInternships() {
        return apiRequest("/company/internships", "GET", null, true);
    }
    async function getApplicants() {
        return apiRequest("/company/applicants", "GET", null, true);
    }
    
    // Function to check if user has privileges
    async function checkUserPrivileges(token) {
        try {
            const response = await fetch(`${API_BASE_URL}/student/privileges`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // If user has any privileges, return true
                return data.success && data.privileges && data.privileges.length > 0;
            }
            return false;
        } catch (error) {
            console.error("Error checking user privileges:", error);
            return false;
        }
    }

    // --- General Information Helper ---
    async function loadGeneralInformation() {
        const companyList = document.querySelector(".company-list");
        
        try {
            // Fetch company names from public endpoint (no admin auth required)
            const response = await apiRequest("/internships/companies", "GET", null, false);
            const companies = response.companies || response; // Handle different response formats
            
            if (companyList) {
                if (companies && companies.length > 0) {
                    // Clear loading message and add real companies
                    companyList.innerHTML = "";
                    companies.slice(0, 6).forEach(company => {
                        const companyTag = document.createElement("span");
                        companyTag.className = "company-tag";
                        companyTag.textContent = company.name;
                        companyList.appendChild(companyTag);
                    });
                    console.log(`Loaded ${companies.length} real company names`);
                } else {
                    // No companies found
                    companyList.innerHTML = '<span class="company-tag">No companies found</span>';
                    console.log("No companies found in database");
                }
            }
        } catch (error) {
            console.log("Could not load company data:", error.message);
            // Show error message instead of static companies
            if (companyList) {
                companyList.innerHTML = '<span class="company-tag error">Unable to load companies</span>';
            }
        }
    }

    // --- Internship Type Filter Helpers ---
    function ensureStudentTypeFilterUI() {
        const filtersDiv = document.querySelector('#internships-section .filters');
        if (!filtersDiv) return;
        if (!document.getElementById('student-type-filter')) {
            const select = document.createElement('select');
            select.id = 'student-type-filter';
            select.innerHTML = '<option value="">All Types</option>' + INTERNSHIP_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
            filtersDiv.appendChild(select);
            select.addEventListener('change', () => {
                filterStudentInternships();
            });
        }
    }

    function filterStudentInternships() {
        const select = document.getElementById('student-type-filter');
        const type = select ? select.value : '';
        const source = Array.isArray(studentInternshipsCache) ? studentInternshipsCache : [];
        const filtered = type ? source.filter(i => (i.type || '').toLowerCase() === type.toLowerCase()) : source;
        displayInternships(filtered, browseInternshipList);
    }

    function ensureCompanyTypeFilterUI() {
        const section = document.querySelector('#company-dashboard-section .posted-internships');
        if (!section) return;
        let filtersDiv = section.querySelector('.filters');
        const listEl = section.querySelector('#company-internship-list');
        if (!filtersDiv) {
            filtersDiv = document.createElement('div');
            filtersDiv.className = 'filters';
            if (listEl && listEl.parentNode) {
                section.insertBefore(filtersDiv, listEl);
            } else {
                section.prepend(filtersDiv);
            }
        }
        if (!document.getElementById('company-type-filter')) {
            const select = document.createElement('select');
            select.id = 'company-type-filter';
            select.innerHTML = '<option value="">All Types</option>' + INTERNSHIP_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
            filtersDiv.appendChild(select);
            select.addEventListener('change', filterCompanyInternships);
        }
    }

    function filterCompanyInternships() {
        const select = document.getElementById('company-type-filter');
        const type = select ? select.value : '';
        const source = Array.isArray(companyInternshipsCache) ? companyInternshipsCache : [];
        const filtered = type ? source.filter(i => (i.type || '').toLowerCase() === type.toLowerCase()) : source;
        displayInternships(filtered, companyInternshipList, false, true);
    }

    // --- Company Dashboard Helper ---
    async function renderCompanyDashboard() {
        try {
            const profile = await apiRequest("/company/profile", "GET", null, true);
            companyDisplayName.textContent = profile.name || "Company Name";
            document.getElementById("company-address").textContent = profile.address || "N/A";
            document.getElementById("company-about").textContent = profile.about || "N/A";
        } catch (error) {
            console.error("Failed to load company profile:", error);
            companyDisplayName.textContent = "Company Name";
            document.getElementById("company-address").textContent = "N/A";
            document.getElementById("company-about").textContent = "N/A";
        }

        let internships = [];
        try {
            internships = await getCompanyInternships();
        } catch (error) {
            console.error("Failed to load company internships:", error);
        }

        let applicants = [];
        try {
            applicants = await getApplicants();
        } catch (error) {
            console.error("Failed to load company applicants:", error);
        }

        companyInternshipsCache = internships;
        ensureCompanyTypeFilterUI();
        filterCompanyInternships();
        displayApplicants(applicants);

        const pendingApplicants = applicants.filter(applicant =>
            applicant.status !== 'accepted' && applicant.status !== 'rejected'
        );
        document.getElementById("posted-internships").textContent = internships.length;
        document.getElementById("active-internships").textContent = internships.filter(i => i.status === 'active').length;
        document.getElementById("total-applicants").textContent = pendingApplicants.length;
    }

    // --- UI Functions ---
    function displayInternships(internshipArray, containerElement, showApplyButton = true, showRejectButton = false) {
        containerElement.innerHTML = "";
        if (internshipArray.length === 0) {
            containerElement.innerHTML = '<p class="no-results"><i class="fas fa-box-open"></i> No internships found.</p>';
            return;
        }
        
        // Create table structure
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
                            ${showApplyButton || showRejectButton ? '<th>Actions</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        internshipArray.forEach(internship => {
            // Determine application status for this internship (student only)
            const status = (currentUser && currentUser.role === 'student') ? studentApplicationStatus[internship.id] : null;
            const applied = !!status;
            tableHTML += `
                <tr>
                    <td>${internship.title}</td>
                    <td>${internship.companyName || internship.company_name || 'N/A'}</td>
                    <td>${internship.type}</td>
                    <td>${internship.location}</td>
                    <td>${internship.duration} months</td>
                    <td class="description-cell">${internship.description}</td>
                    <td>${internship.skills}</td>
                    ${showApplyButton || showRejectButton ? `
                        <td class="actions-cell">
                            ${showApplyButton ? `
                                <button class="apply-btn btn btn-success btn-sm ${applied ? "applied" : ""}"
                                        data-internship-id="${internship.id}"
                                        ${applied ? "disabled" : ""}>
                                    ${!status ? "Apply" : (status === 'accepted' ? "Accepted" : (status === 'rejected' ? "Applied" : "Appling"))}
                                </button>
                            ` : ""}
                            ${showRejectButton && internship.status !== 'rejected' ? `
                                <button class="reject-btn btn btn-danger btn-sm" data-internship-id="${internship.id}">
                                    Reject
                                </button>
                            ` : ""}
                            ${internship.status === 'rejected' ? `
                                <span class="status-badge pending">Rejected</span>
                            ` : ""}
                        </td>
                    ` : ''}
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        containerElement.innerHTML = tableHTML;

        // Add event listeners for apply buttons if showApplyButton is true
        if (showApplyButton) {
            containerElement.querySelectorAll(".apply-btn").forEach(button => {
                if (button.classList.contains("applied")) return;
                button.addEventListener("click", async (e) => {
                    const internshipId = parseInt(e.target.dataset.internshipId);
                    try {
                        await applyForInternship(internshipId);
                        alert(`Applied for ${internshipArray.find(i => i.id === internshipId).title} successfully!`);
                        // Update button state instantly
                        e.target.textContent = "Appling";
                        e.target.disabled = true;
                        e.target.classList.add("applied");
                        // Track status locally; backend will reflect true status on next load
                        studentApplicationStatus[internshipId] = 'pending';
                        if (!currentUser.appliedInternships) {
                            currentUser.appliedInternships = [];
                        }
                        currentUser.appliedInternships.push(internshipId);
                    } catch (error) {
                        alert("Application failed: " + error.message);
                    }
                });
            });
        }
        
        // Add event listeners for reject buttons if showRejectButton is true
        if (showRejectButton) {
            containerElement.querySelectorAll(".reject-btn").forEach(button => {
                button.addEventListener("click", async (e) => {
                    const internshipId = parseInt(e.target.dataset.internshipId);
                    const internship = internshipArray.find(i => i.id === internshipId);
                    if (!internship) return;
                    
                    if (confirm(`Are you sure you want to reject the internship "${internship.title}"?`)) {
                        try {
                            await apiRequest(`/company/internships/${internshipId}/reject`, 'POST', null, true);
                            alert('Internship rejected successfully!');
                            // Refresh the internships list
                            const internships = await getCompanyInternships();
                            companyInternshipsCache = internships;
                            if (containerElement && containerElement.id === 'company-internship-list') {
                                ensureCompanyTypeFilterUI();
                                filterCompanyInternships();
                            } else {
                                displayInternships(internships, containerElement, false, true);
                            }
                        } catch (error) {
                            alert('Failed to reject internship: ' + error.message);
                        }
                    }
                });
            });
        }
    }
    
    function displaySimplifiedInternships(internshipArray, containerElement) {
        containerElement.innerHTML = "";
        if (internshipArray.length === 0) {
            containerElement.innerHTML = '<p class="no-results"><i class="fas fa-box-open"></i> No internships found.</p>';
            return;
        }
        
        // Create table structure for student dashboard
        let tableHTML = `
            <div class="table-container">
                <table class="internships-table">
                    <thead>
                        <tr>
                            <th>Position</th>
                            <th>Company</th>
                            <th>Type</th>
                            <th>Location</th>
                            <th>Duration</th>
                            <th>Skills</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        internshipArray.forEach(internship => {
            tableHTML += `
                <tr>
                    <td>${internship.title}</td>
                    <td>${internship.companyName || internship.company_name || 'N/A'}</td>
                    <td>${internship.type || 'N/A'}</td>
                    <td>${internship.location || 'Not specified'}</td>
                    <td>${internship.duration ? internship.duration + ' months' : 'N/A'}</td>
                    <td>${internship.skills || 'N/A'}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        containerElement.innerHTML = tableHTML;
    }

    function displayApplicants(applicants) {
        // Filter out accepted and rejected applicants from the main list
        const pendingApplicants = applicants.filter(applicant =>
            applicant.status !== 'accepted' && applicant.status !== 'rejected'
        );
        
        applicantsList.innerHTML = "";
        if (pendingApplicants.length === 0) {
            applicantsList.innerHTML = `
                <div class="no-applicants">
                    <i class="fas fa-users-slash"></i>
                    <p>No applicants found</p>
                </div>
            `;
            return;
        }
        
        // Create table structure for applicants
        let tableHTML = `
            <div class="table-container">
                <table class="internships-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Applied For</th>
                            <th>Education</th>
                            <th>Skills</th>
                            <th>Projects</th>
                            <th>Resume</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        pendingApplicants.forEach(applicant => {
            // Debug log to see what data we're getting
            console.log('Applicant data:', applicant);
            
            // Format education
            const education = applicant.education && applicant.education.length > 0 
                ? applicant.education.map(edu => `${edu.degree || 'Degree'} at ${edu.institution || 'Institution'}`).join(', ')
                : 'No education added';
            
            // Format skills
            const skills = applicant.skills && applicant.skills.length > 0 
                ? applicant.skills.join(', ')
                : 'No skills added';
            
            // Format projects
            const projects = applicant.projects && applicant.projects.length > 0 
                ? applicant.projects.map(proj => proj.title || 'Untitled Project').join(', ')
                : 'No projects added';
            
            tableHTML += `
                <tr>
                    <td><i class="fas fa-user"></i> ${applicant.studentName}</td>
                    <td>${applicant.internship_title || 'Unknown Internship'}</td>
                    <td class="description-cell">${education}</td>
                    <td class="description-cell">${skills}</td>
                    <td class="description-cell">${projects}</td>
                    <td>
                        ${applicant.resume
                            ? `<button type="button" data-resume-file="${applicant.resume}" class="btn btn-info btn-sm">
                                <i class="fas fa-file-pdf"></i> View Resume
                            </button>`
                            : 'No resume uploaded'}
                    </td>
                    <td class="actions-cell">
                        ${applicant.status === 'awaiting_payment' ? 
                          '<span class="status-badge pending">Awaiting Admin Approval</span>' : 
                          '<button class="accept-applicant-btn btn btn-success btn-sm" data-application-id="' + applicant.id + '">\
                            <i class="fas fa-check"></i> Ready to Accept\
                          </button>\
                          <button class="reject-applicant-btn btn btn-danger btn-sm" data-application-id="' + applicant.id + '">\
                            <i class="fas fa-times"></i> Reject\
                          </button>'
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
        
        applicantsList.innerHTML = tableHTML;
        
        // Add event listeners for accept and reject buttons
        document.querySelectorAll('.accept-applicant-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const applicationId = e.target.closest('button').dataset.applicationId;
                try {
                    await apiRequest(`/company/applications/${applicationId}/accept`, 'POST', null, true);
                    alert('Payment instructions sent to the student. Waiting for admin approval.');
                    // Refresh the applicants list
                    const applicants = await getApplicants();
                    displayApplicants(applicants);
                    // Update company dashboard statistics
                    await renderCompanyDashboard();
                } catch (error) {
                    alert('Failed to accept application: ' + error.message);
                }
            });
        });
        
        document.querySelectorAll('.reject-applicant-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const applicationId = e.target.closest('button').dataset.applicationId;
                try {
                    await apiRequest(`/company/applications/${applicationId}/reject`, 'POST', null, true);
                    alert('Application rejected successfully!');
                    // Refresh the applicants list
                    const applicants = await getApplicants();
                    displayApplicants(applicants);
                    // Update company dashboard statistics
                    await renderCompanyDashboard();
                } catch (error) {
                    alert('Failed to reject application: ' + error.message);
                }
            });
        });
    }
    
    function displayAcceptedApplicants(applicants) {
        // Filter to show only accepted applicants
        const acceptedApplicants = applicants.filter(applicant => applicant.status === 'accepted');
        
        applicantsList.innerHTML = "";
        
        // Add a back button to return to all applicants
        const backButton = document.createElement("button");
        backButton.className = "btn btn-secondary";
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to All Applicants';
        backButton.addEventListener("click", async () => {
            const allApplicants = await getApplicants();
            displayApplicants(allApplicants);
        });
        applicantsList.appendChild(backButton);
        
        if (acceptedApplicants.length === 0) {
            const noApplicants = document.createElement("div");
            noApplicants.className = "no-applicants";
            noApplicants.innerHTML = `
                <i class="fas fa-users-slash"></i>
                <p>No accepted applicants found</p>
            `;
            applicantsList.appendChild(noApplicants);
            return;
        }
        
        // Display each accepted applicant with their name and education
        const acceptedList = document.createElement("div");
        acceptedList.className = "accepted-applicants-list";
        acceptedApplicants.forEach(applicant => {
            const applicantCard = document.createElement("div");
            applicantCard.className = "applicant-card";
            
            // Format education information
            let educationInfo = "No education information";
            if (applicant.education && applicant.education.length > 0) {
                educationInfo = applicant.education.map(edu => 
                    `${edu.degree || 'Degree'} at ${edu.institution || 'Institution'}`
                ).join(", ");
            }
            
            applicantCard.innerHTML = `
                <h5><i class="fas fa-user-check"></i> ${applicant.studentName}</h5>
                <p><strong>Education:</strong> ${educationInfo}</p>
                <p><strong>Applied for:</strong> ${applicant.internship_title || 'Unknown Internship'}</p>
            `;
            acceptedList.appendChild(applicantCard);
        });
        applicantsList.appendChild(acceptedList);
    }

    function renderPortfolioDisplay(profile) {
        const portfolio = profile.portfolio || {
            education: [],
            skills: [],
            projects: [],
            resume: null
        };
        // Use resume from main profile object, not nested portfolio
        portfolio.resume = profile.resume || portfolio.resume;
        // Update portfolio name with portfolio data
        document.getElementById("portfolio-name").textContent = portfolio.name || currentUser.name;
        studentDisplayName.textContent = portfolio.name || currentUser.name;
        
        // Update education summary with actual education data
        const educationSummary = document.getElementById("portfolio-education-summary");
        if (portfolio.education && portfolio.education.length > 0) {
            // Display the first education entry
            const firstEducation = portfolio.education[0];
            educationSummary.textContent = `${firstEducation.degree} at ${firstEducation.institution}`;
        } else {
            educationSummary.textContent = "No education added.";
        }
        
        const educationContent = document.getElementById("education-content");
        educationContent.innerHTML = portfolio.education.length > 0
            ? portfolio.education.map(edu =>
                `<p class="education-item">${edu.institution} - ${edu.degree}</p>`
              ).join("")
            : '<p class="empty-field">No education added.</p>';
        const skillsContent = document.getElementById("skills-content");
        skillsContent.innerHTML = portfolio.skills.length > 0
            ? portfolio.skills.map(skill =>
                `<span class="skill-tag">${skill}</span>`
              ).join("")
            : '<p class="empty-field">No skills added.</p>';
        const projectsContent = document.getElementById("projects-content");
        projectsContent.innerHTML = portfolio.projects.length > 0
            ? portfolio.projects.map(project => `
                <div class="project-item">
                    <h4>${project.title}</h4>
                    <p>${project.description}</p>
                </div>
              `).join("")
            : '<p class="empty-field">No projects added.</p>';
        const resumeStatus = document.getElementById("resume-status-display");
        if (portfolio.resume) {
            resumeStatus.innerHTML = `
                <i class="fas fa-file-pdf"></i>
                <a href="#" data-resume-file="${portfolio.resume}">View Resume</a>
            `;
            document.getElementById("upload-resume-display-btn").textContent = "Change Resume";
        } else {
            resumeStatus.textContent = "No resume uploaded";
            document.getElementById("upload-resume-display-btn").textContent = "Upload Resume";
        }
    }

    function populatePortfolioEditForm(profile) {
        const portfolio = profile.portfolio || {
            education: [],
            skills: [],
            projects: [],
            resume: null
        };
        // Use resume from main profile object, not nested portfolio
        portfolio.resume = profile.resume || portfolio.resume;
        document.getElementById("edit-student-name").value = portfolio.name || currentUser.name;
        const editEducationContainer = document.getElementById("edit-education-container");
        if (portfolio.education && portfolio.education.length > 0) {
            editEducationContainer.innerHTML = portfolio.education
                .map(edu => `
                    <div class="edit-education-item">
                        <input type="text" value="${edu.institution || ''}" placeholder="Institution">
                        <input type="text" value="${edu.degree || ''}" placeholder="Degree">
                        <button class="remove-edit-item-btn"><i class="fas fa-times"></i></button>
                    </div>
                `).join("");
        } else {
            editEducationContainer.innerHTML = `
                <div class="edit-education-item">
                    <input type="text" placeholder="Institution">
                    <input type="text" placeholder="Degree">
                </div>
            `;
        }
        const editSkillsContainer = document.getElementById("edit-skills-container");
        editSkillsContainer.innerHTML = portfolio.skills
            .map(skill => `
                <span class="skill-tag">${skill} <i class="fas fa-times remove-edit-skill"></i></span>
            `).join("");
        const editProjectsContainer = document.getElementById("edit-projects-container");
        editProjectsContainer.innerHTML = portfolio.projects
            .map(project => `
                <div class="edit-project-item">
                    <input type="text" class="edit-project-title" value="${project.title || ''}" placeholder="Project Title">
                    <textarea class="edit-project-description" placeholder="Project Description">${project.description || ''}</textarea>
                    <button class="remove-edit-item-btn"><i class="fas fa-times"></i></button>
                </div>
            `).join("") || "";
        const resumeStatusEdit = document.getElementById("resume-status-edit");
        if (portfolio.resume) {
            resumeStatusEdit.innerHTML = `<i class="fas fa-file-pdf"></i> ${portfolio.resume}`;
        } else {
            resumeStatusEdit.textContent = "No resume uploaded";
        }
    }

    function togglePortfolioEditMode(isEditing) {
        document.getElementById("student-portfolio-display").classList.toggle("hidden", isEditing);
        document.getElementById("student-portfolio-edit-form").classList.toggle("hidden", !isEditing);
        if (isEditing) {
            getStudentProfile().then(profile => {
                populatePortfolioEditForm(profile);
            });
        }
    }
    
    function toggleProfileEditMode(isEditing) {
        document.getElementById("profile-edit-section").classList.toggle("hidden", !isEditing);
        if (isEditing) {
            getStudentProfile().then(profile => {
                document.getElementById("edit-student-name-profile").value = profile.name || "";
                document.getElementById("edit-student-phone").value = profile.phone || "";
                document.getElementById("edit-student-university").value = profile.university || "";
            });
        }
    }

    // --- Event Listeners ---
    loginTab.addEventListener("click", () => {
        setActiveTab(loginTab);
        switchAuthForm(loginForm);
        document.querySelector('.role-selector').classList.add('hidden');
    });
    registerTab.addEventListener("click", () => {
        setActiveTab(registerTab);
        const selectedRole = roleSelect.value;
        switchAuthForm(selectedRole === 'student' ? studentRegisterForm : companyRegisterForm);
        document.querySelector('.role-selector').classList.remove('hidden');
    });
    roleSelect.addEventListener("change", () => {
        const selectedRole = roleSelect.value;
        switchAuthForm(selectedRole === 'student' ? studentRegisterForm : companyRegisterForm);
        setActiveTab(registerTab);
    });
    switchToRegisterLink.addEventListener("click", (e) => {
        e.preventDefault();
        registerTab.click();
    });
    switchToLoginLink.addEventListener("click", (e) => {
        e.preventDefault();
        loginTab.click();
    });
    switchToLoginCompanyLink.addEventListener("click", (e) => {
        e.preventDefault();
        loginTab.click();
    });
    document.querySelectorAll(".toggle-password").forEach(toggle => {
        toggle.addEventListener("click", () => {
            const passwordInput = toggle.previousElementSibling;
            const isPassword = passwordInput.type === "password";
            passwordInput.type = isPassword ? "text" : "password";
            toggle.classList.toggle("fa-eye-slash", isPassword);
            toggle.classList.toggle("fa-eye", !isPassword);
        });
    });

    // Login
    loginBtn.addEventListener("click", async () => {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        if (!email || !password) {
            alert("Please fill in all required fields");
            return;
        }
        try {
            const { token, user } = await login(email, password);
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
            localStorage.setItem("token", token);
            currentUser = user;
            authContainer.classList.add("hidden");
            resetAuthFormInputs();

            // Always enter normal role dashboard from index.html
            if (user.role === "privileged_admin") {
                window.location.href = "admin.html";
            } else if (user.role === "student") {
                studentContainer.classList.remove("hidden");
                const profile = await getStudentProfile();
                renderPortfolioDisplay(profile);
                await loadGeneralInformation();
                showSection("dashboard-section");
            } else if (user.role === "company") {
                companyContainer.classList.remove("hidden");
                await renderCompanyDashboard();
                showSection("company-dashboard-section");
            } else {
                window.location.href = "home.html";
            }
        } catch (error) {
            alert("Login failed: " + error.message);
        }
    });

    // Student Registration
    studentRegisterBtn.addEventListener("click", async () => {
        const studentData = {
            name: document.getElementById("student-name").value.trim(),
            email: document.getElementById("student-email").value.trim(),
            password: document.getElementById("student-password").value,
            confirmPassword: document.getElementById("student-confirm-password").value,
            phone: document.getElementById("student-phone").value.trim(),
            university: document.getElementById("university").value.trim()
        };
        if (!studentData.name || !studentData.email || !studentData.password || 
            !studentData.confirmPassword || !studentData.university || !studentData.phone) {
            alert("Please fill in all required fields including phone number.");
            return;
        }
        const isValidPhone = /^\+251\d{9}$/.test(studentData.phone);
        if (!isValidPhone) {
            alert("Invalid phone number. It must start with +251 followed by 9 digits.");
            return;
        }
        const containsNumber = /\d/;
        if (containsNumber.test(studentData.name)) {
            alert("Name should not contain numbers.");
            return;
        }
        if (containsNumber.test(studentData.university)) {
            alert("University name should not contain numbers.");
            return;
        }
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentData.email);
        if (!isValidEmail) {
            alert("Invalid email format.");
            return;
        }
        const isStrongPassword = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(studentData.password);
        if (!isStrongPassword) {
            alert("Password must be at least 8 characters long, include at least one number and one uppercase letter.");
            return;
        }
        if (studentData.password !== studentData.confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        const termsCheckbox = document.getElementById("student-terms");
        if (!termsCheckbox.checked) {
            alert("Please agree to the Terms of Service and Privacy Policy to proceed.");
            return;
        }
        try {
            await registerStudent(studentData);
            alert("Registration submitted successfully! Please wait for admin approval before logging in.");
            loginTab.click();
            resetAuthFormInputs();
        } catch (error) {
            alert("Registration failed: " + error.message);
        }
    });

    // Company Registration
    companyRegisterBtn.addEventListener("click", async () => {
        const companyData = {
            name: document.getElementById("company-name").value.trim(),
            email: document.getElementById("company-email").value.trim(),
            password: document.getElementById("company-password").value,
            confirmPassword: document.getElementById("company-confirm-password").value
        };
        const termsCheckbox = document.getElementById("company-terms");
        if (!companyData.name || !companyData.email || !companyData.password || !companyData.confirmPassword) {
            alert("Please fill in all required fields.");
            return;
        }
        const containsNumber = /\d/;
        if (containsNumber.test(companyData.name)) {
            alert("Company name should not contain numbers.");
            return;
        }
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.email);
        if (!isValidEmail) {
            alert("Invalid email format.");
            return;
        }
        const isStrongPassword = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(companyData.password);
        if (!isStrongPassword) {
            alert("Password must be at least 8 characters long and include at least one uppercase letter and one number.");
            return;
        }
        if (companyData.password !== companyData.confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        if (!termsCheckbox.checked) {
            alert("Please agree to the Terms of Service and Privacy Policy to proceed.");
            return;
        }
        try {
            await registerCompany(companyData);
            alert("Registration submitted successfully! Please wait for admin approval before logging in.");
            loginTab.click();
            resetAuthFormInputs();
        } catch (error) {
            alert("Registration failed: " + error.message);
        }
    });

    // Logout
    studentLogoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        studentContainer.classList.add("hidden");
        window.location.href = "home.html";
    });
    companyLogoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        companyContainer.classList.add("hidden");
        window.location.href = "home.html";
    });

    // Student Navigation
    studentNavLinks.forEach(link => {
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            studentNavLinks.forEach(nav => nav.classList.remove("active"));
            e.target.closest(".nav-link").classList.add("active");
            const section = e.target.closest(".nav-link").dataset.section;
            showSection(`${section}-section`);
            if (section === "internships") {
                // Load student's application statuses before rendering internships
                if (currentUser && currentUser.role === 'student') {
                    try {
                        const apps = await apiRequest("/student/applications", "GET", null, true);
                        studentApplicationStatus = {};
                        if (Array.isArray(apps)) {
                            apps.forEach(a => {
                                // a.id is internship id, a.application_status is status
                                if (a && typeof a.id !== 'undefined') {
                                    studentApplicationStatus[a.id] = a.application_status || 'pending';
                                }
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to load student applications:', e.message);
                        studentApplicationStatus = {};
                    }
                }
                // Ensure type filter UI exists and apply selected filter
                ensureStudentTypeFilterUI();
                const internships = await getInternships();
                studentInternshipsCache = internships;
                filterStudentInternships();
            }
        });
    });

    // Company Navigation
    companyNavLinks.forEach(link => {
        link.addEventListener("click", async (e) => {
            e.preventDefault();
            companyNavLinks.forEach(nav => nav.classList.remove("active"));
            e.target.closest(".nav-link").classList.add("active");
            const section = e.target.closest(".nav-link").dataset.section;
            showSection(`${section}-section`);
           // ...inside companyNavLinks.forEach...
if (section === "dashboard") {
    await renderCompanyDashboard();
    showSection("company-dashboard-section"); // <-- ensure section is visible
} else if (section === "applicants") {
                // Populate internship filter dropdown
                const internships = await getCompanyInternships();
                const applicantFilter = document.getElementById("applicant-filter");
                applicantFilter.innerHTML = '<option value="">All Internships</option>';
                internships.forEach(internship => {
                    const option = document.createElement("option");
                    option.value = internship.id;
                    option.textContent = internship.title;
                    applicantFilter.appendChild(option);
                });
                
                const applicants = await getApplicants();
                displayApplicants(applicants);
            }
        });
    });
    
    // Add event listener for applicant filter
    document.getElementById("applicant-filter").addEventListener("change", filterApplicants);
    
    // Add event listener for applicant search
    document.getElementById("applicant-search").addEventListener("input", filterApplicants);
    
    // Add event listener for refresh button
    document.getElementById("refresh-applicants-btn").addEventListener("click", async () => {
        // Repopulate internship filter
        const internships = await getCompanyInternships();
        const applicantFilter = document.getElementById("applicant-filter");
        // Save current selection
        const currentSelection = applicantFilter.value;
        applicantFilter.innerHTML = '<option value="">All Internships</option>';
        internships.forEach(internship => {
            const option = document.createElement("option");
            option.value = internship.id;
            option.textContent = internship.title;
            applicantFilter.appendChild(option);
        });
        // Restore selection if it still exists
        if (currentSelection) {
            applicantFilter.value = currentSelection;
        }
        
        // Refresh applicants list
        const applicants = await getApplicants();
        displayApplicants(applicants);
        filterApplicants(); // Apply current filters
    });
    
    // Add event listener for accepted applicants button
    document.getElementById("accepted-applicants-btn").addEventListener("click", async () => {
        // Get all applicants
        const allApplicants = await getApplicants();
        
        // Display accepted applicants (filtering is done in the function)
        displayAcceptedApplicants(allApplicants);
    });
    
    // Function to filter applicants based on internship and search text
    async function filterApplicants() {
        const internshipId = document.getElementById("applicant-filter").value;
        const searchText = document.getElementById("applicant-search").value.toLowerCase();
        
        // Get all applicants
        const allApplicants = await getApplicants();
        
        // Filter applicants - only show pending applicants (not accepted or rejected)
        const filteredApplicants = allApplicants.filter(applicant => {
            // Filter by status - only show pending applicants
            if (applicant.status === 'accepted' || applicant.status === 'rejected') {
                return false;
            }
            
            // Filter by internship if selected
            if (internshipId && applicant.internship_id != internshipId) {
                return false;
            }
            
            // Filter by search text (name or email)
            if (searchText &&
                !applicant.studentName.toLowerCase().includes(searchText) &&
                !applicant.studentEmail.toLowerCase().includes(searchText)) {
                return false;
            }
            
            return true;
        });
        
        // Display filtered applicants
        displayApplicants(filteredApplicants);
    }

    // Internship Filtering
    // Removed filter functionality as requested

    // Post Internship
    document.getElementById("internship-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const internshipData = {
            title: document.getElementById("internship-title").value,
            type: document.getElementById("internship-type").value,
            description: document.getElementById("internship-desc").value,
            skills: document.getElementById("internship-skills").value,
            location: document.getElementById("internship-location").value,
            duration: parseInt(document.getElementById("internship-duration").value),
        };
        try {
            await createInternship(internshipData);
            alert("Internship posted successfully!");
            document.getElementById("internship-form").reset();
            await renderCompanyDashboard();
            companyNavLinks.forEach(nav => nav.classList.remove("active"));
            document.querySelector('[data-section="dashboard"]').classList.add("active");
            showSection("company-dashboard-section");
        } catch (error) {
            alert("Failed to post internship: " + error.message);
        }
    });
    
    // Company Profile Edit - Updated to work with dropdown
    document.getElementById("edit-company-profile-dropdown").addEventListener("click", (e) => {
        e.preventDefault();
        // Hide company profile section and show edit form
        document.querySelector('#company-dashboard-section .company-profile').classList.add('hidden');
        document.getElementById("company-profile-edit-section").classList.remove('hidden');
        // Close dropdown after clicking
        document.querySelector("#company-container .profile-dropdown").classList.remove("show");
        // Populate form with current profile data
        apiRequest("/company/profile", "GET", null, true).then(profile => {
            document.getElementById("edit-company-name").value = profile.name || "";
            document.getElementById("edit-company-address").value = profile.address || "";
            document.getElementById("edit-company-about").value = profile.about || "";
        });
    });
    
    document.getElementById("cancel-company-edit").addEventListener("click", () => {
        // Show company profile section and hide edit form
        document.querySelector('#company-dashboard-section .company-profile').classList.remove('hidden');
        document.getElementById("company-profile-edit-section").classList.add('hidden');
    });
    
    document.getElementById("edit-company-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const profileData = {
            name: document.getElementById("edit-company-name").value,
            address: document.getElementById("edit-company-address").value,
            about: document.getElementById("edit-company-about").value
        };
        
        try {
            await apiRequest("/company/profile", "PUT", profileData, true);
            alert("Profile updated successfully!");
            // Update displayed profile information
            document.getElementById("company-display-name").textContent = profileData.name;
            document.getElementById("company-address").textContent = profileData.address;
            document.getElementById("company-about").textContent = profileData.about;
            // Show company profile section and hide edit form
            document.querySelector('#company-dashboard-section .company-profile').classList.remove('hidden');
            document.getElementById("company-profile-edit-section").classList.add('hidden');
        } catch (error) {
            alert("Failed to update profile: " + error.message);
        }
    });

    // Profile Dropdown Toggle - Student
    document.getElementById("profile-dropdown-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = document.querySelector("#student-container .profile-dropdown");
        dropdown.classList.toggle("show");
    });

    // Profile Dropdown Toggle - Company
    document.getElementById("company-profile-dropdown-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = document.querySelector("#company-container .profile-dropdown");
        dropdown.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        const studentDropdown = document.querySelector("#student-container .profile-dropdown");
        const companyDropdown = document.querySelector("#company-container .profile-dropdown");
        
        if (studentDropdown && !studentDropdown.contains(e.target)) {
            studentDropdown.classList.remove("show");
        }
        if (companyDropdown && !companyDropdown.contains(e.target)) {
            companyDropdown.classList.remove("show");
        }
    });

    // Portfolio Edit Mode - Updated to work with dropdown
    document.getElementById("edit-portfolio-dropdown").addEventListener("click", (e) => {
        e.preventDefault();
        togglePortfolioEditMode(true);
        // Close dropdown after clicking
        document.querySelector(".profile-dropdown").classList.remove("show");
        // Navigate to portfolio section if not already there
        const portfolioSection = document.getElementById("portfolio-section");
        const allSections = document.querySelectorAll(".student-main-content");
        allSections.forEach(section => section.classList.add("hidden"));
        portfolioSection.classList.remove("hidden");
        
        // Update nav link active state
        document.querySelectorAll(".nav-link").forEach(link => link.classList.remove("active"));
        document.querySelector('[data-section="portfolio"]').classList.add("active");
    });
    
    document.getElementById("cancel-portfolio-edit").addEventListener("click", () => togglePortfolioEditMode(false));
    
    // Add event delegation for dynamically added elements in portfolio edit form
    document.getElementById("student-portfolio-edit-form").addEventListener("click", (e) => {
        // Add education
        if (e.target.id === "add-edit-education-btn") {
            const container = document.getElementById("edit-education-container");
            const newEducation = document.createElement("div");
            newEducation.className = "edit-education-item";
            newEducation.innerHTML = `
                <input type="text" placeholder="Institution">
                <input type="text" placeholder="Degree">
                <button class="remove-edit-item-btn"><i class="fas fa-times"></i></button>
            `;
            container.appendChild(newEducation);
        }
        
        // Add skill
        if (e.target.id === "add-edit-skill-btn") {
            const skillInput = document.getElementById("edit-new-skill");
            const skill = skillInput.value.trim();
            if (skill) {
                const container = document.getElementById("edit-skills-container");
                const skillTag = document.createElement("span");
                skillTag.className = "skill-tag";
                skillTag.innerHTML = `${skill} <i class="fas fa-times remove-edit-skill"></i>`;
                container.appendChild(skillTag);
                skillInput.value = "";
            }
        }
        
        // Add project via inline form inputs
        if (e.target.id === "add-edit-project-btn") {
            const titleInput = document.getElementById("edit-new-project-title");
            const descInput = document.getElementById("edit-new-project-description");
            const title = titleInput.value.trim();
            const description = descInput.value.trim();
            if (!title) return; // require at least a title
            const container = document.getElementById("edit-projects-container");
            const newProject = document.createElement("div");
            newProject.className = "edit-project-item";
            newProject.innerHTML = `
                <input type="text" class="edit-project-title" value="${title}" placeholder="Project Title">
                <textarea class="edit-project-description" placeholder="Project Description">${description}</textarea>
                <button class="remove-edit-item-btn"><i class="fas fa-times"></i></button>
            `;
            container.appendChild(newProject);
            // clear inline inputs
            titleInput.value = "";
            descInput.value = "";
        }
        
        // Remove education, skill, or project
        if (e.target.classList.contains("remove-edit-item-btn") || e.target.classList.contains("remove-edit-skill")) {
            const educationItem = e.target.closest(".edit-education-item");
            const projectItem = e.target.closest(".edit-project-item");
            const skillTag = e.target.closest(".skill-tag");

            if (educationItem) {
                const container = document.getElementById("edit-education-container");
                const total = container.querySelectorAll(".edit-education-item").length;
                if (total > 1) {
                    educationItem.remove();
                } else {
                    // Clear inputs instead of removing the last one
                    const inputs = educationItem.querySelectorAll("input");
                    inputs.forEach(inp => inp.value = "");
                }
            } else if (projectItem) {
                projectItem.remove();
            } else if (skillTag) {
                skillTag.remove();
            }
        }
    });
    
    // Add skill on Enter key press
    document.getElementById("edit-new-skill").addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            document.getElementById("add-edit-skill-btn").click();
        }
    });
    
    // Forgot Password Event Listeners
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", (e) => {
            e.preventDefault();
            forgotPasswordModal.classList.remove("hidden");
            showForgotPasswordStep(1);
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener("click", () => {
            forgotPasswordModal.classList.add("hidden");
            resetForgotPasswordForm();
        });
    }
    
    if (sendResetCodeBtn) {
        sendResetCodeBtn.addEventListener("click", sendResetCode);
    }
    
    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener("click", verifyResetCode);
    }
    
    if (resetPasswordBtn) {
        resetPasswordBtn.addEventListener("click", resetPassword);
    }
    
    if (resendCodeLink) {
        resendCodeLink.addEventListener("click", (e) => {
            e.preventDefault();
            sendResetCode();
        });
    }
    
    // Forgot Password Functions
    function showForgotPasswordStep(step) {
        // Hide all steps
        document.querySelectorAll(".forgot-password-step").forEach(stepEl => {
            stepEl.classList.add("hidden");
        });
        
        // Show the requested step
        document.getElementById(`forgot-password-step-${step}`).classList.remove("hidden");
    }
    
    async function sendResetCode() {
        const email = document.getElementById("forgot-password-email").value.trim();
        
        if (!email) {
            alert("Please enter your email address");
            return;
        }
        
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert("Please enter a valid email address");
            return;
        }
        
        try {
            const response = await apiRequest("/auth/forgot-password", "POST", { email });
            
            if (response.success) {
                resetEmail = email;
                showForgotPasswordStep(2);
                startCountdown();
                alert("Reset code sent to your email");
            } else {
                alert(response.message || "Failed to send reset code");
            }
        } catch (error) {
            alert("Failed to send reset code: " + error.message);
        }
    }
    
    function startCountdown() {
        let timeLeft = 60;
        const countdownElement = document.getElementById("countdown");
        countdownElement.textContent = timeLeft;
        
        // Clear any existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            countdownElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                alert("Reset code has expired. Please request a new code.");
            }
        }, 1000);
    }
    
    async function verifyResetCode() {
        const code = document.getElementById("reset-code").value.trim();
        
        if (!code) {
            alert("Please enter the reset code");
            return;
        }
        
        if (code.length !== 4 || !/^\d+$/.test(code)) {
            alert("Please enter a valid 4-digit code");
            return;
        }
        
        try {
            const response = await apiRequest("/auth/verify-code", "POST", {
                email: resetEmail,
                code: code
            });
            
            if (response.success) {
                showForgotPasswordStep(3);
                clearInterval(countdownInterval);
            } else {
                alert(response.message || "Invalid reset code");
            }
        } catch (error) {
            alert("Failed to verify code: " + error.message);
        }
    }
    
    async function resetPassword() {
        const newPassword = document.getElementById("new-password").value;
        const confirmPassword = document.getElementById("confirm-new-password").value;
        const code = document.getElementById("reset-code").value.trim();
        
        if (!newPassword || !confirmPassword) {
            alert("Please fill in all password fields");
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        
        // Password strength validation (same as registration)
        const isStrongPassword = /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword);
        if (!isStrongPassword) {
            alert("Password must be at least 8 characters long, include at least one number and one uppercase letter.");
            return;
        }
        
        try {
            const response = await apiRequest("/auth/reset-password", "POST", {
                email: resetEmail,
                code: code,
                newPassword: newPassword,
                confirmPassword: confirmPassword
            });
            
            if (response.success) {
                alert("Password reset successfully! Please login with your new password.");
                forgotPasswordModal.classList.add("hidden");
                resetForgotPasswordForm();
                loginTab.click(); // Switch to login tab
            } else {
                alert(response.message || "Failed to reset password");
            }
        } catch (error) {
            alert("Failed to reset password: " + error.message);
        }
    }
    
    function resetForgotPasswordForm() {
        // Reset form fields
        document.getElementById("forgot-password-email").value = "";
        document.getElementById("reset-code").value = "";
        document.getElementById("new-password").value = "";
        document.getElementById("confirm-new-password").value = "";
        
        // Reset steps
        showForgotPasswordStep(1);
        
        // Clear countdown interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // Reset variables
        resetEmail = "";
    }

    // Save Portfolio
    document.getElementById("save-portfolio-btn").addEventListener("click", async () => {
        const portfolioData = {
            name: document.getElementById("edit-student-name").value,
            education: [],
            skills: [],
            projects: [],
        };
        
        // Collect education data
        document.getElementById("edit-education-container").querySelectorAll(".edit-education-item").forEach(item => {
            const inputs = item.querySelectorAll("input");
            // Only add education if both institution and degree are provided
            if (inputs[0].value.trim() || inputs[1].value.trim()) {
                portfolioData.education.push({
                    institution: inputs[0].value.trim(),
                    degree: inputs[1].value.trim()
                });
            }
        });
        
        // Collect skills data
        document.getElementById("edit-skills-container").querySelectorAll(".skill-tag").forEach(tag => {
            const skillText = tag.textContent.trim().replace("×", "");
            if (skillText) {
                portfolioData.skills.push(skillText);
            }
        });
        
        // Collect projects data
        document.getElementById("edit-projects-container").querySelectorAll(".edit-project-item").forEach(item => {
            const titleInput = item.querySelector(".edit-project-title");
            const descriptionInput = item.querySelector(".edit-project-description");
            // Only add project if title is provided
            if (titleInput && titleInput.value.trim()) {
                portfolioData.projects.push({
                    title: titleInput.value.trim(),
                    description: descriptionInput ? descriptionInput.value.trim() : "",
                });
            }
        });
        
        try {
            await updatePortfolio(portfolioData);
            alert("Portfolio updated successfully!");
            togglePortfolioEditMode(false);
            const profile = await getStudentProfile();
            renderPortfolioDisplay(profile);
        } catch (error) {
            alert("Failed to update portfolio: " + error.message);
        }
    });

    
    // Resume Upload
    document.getElementById("upload-resume-edit-btn").addEventListener("click", () =>
        document.getElementById("resume-file-input-edit").click()
    );
    document.getElementById("resume-file-input-edit").addEventListener("change", async (e) => {
        if (e.target.files.length === 0) return;
        try {
            const { fileName } = await uploadResume(e.target.files[0]);
            document.getElementById("resume-status-edit").innerHTML = `<i class="fas fa-file-pdf"></i> ${fileName}`;
            alert("Resume uploaded successfully!");
        } catch (error) {
            alert("Upload failed: " + error.message);
        }
    });
    
    document.getElementById("upload-resume-display-btn").addEventListener("click", () =>
        document.getElementById("resume-file-input-display").click()
    );
    
    document.getElementById("resume-file-input-display").addEventListener("change", async (e) => {
        if (e.target.files.length === 0) return;
        try {
            const result = await uploadResume(e.target.files[0]);
            alert("Resume uploaded successfully!");
            // Update the display immediately with the uploaded file info
            const resumeStatus = document.getElementById("resume-status-display");
            const fileName = result.fileName || result.resume || e.target.files[0].name;
            resumeStatus.innerHTML = `
                <i class="fas fa-file-pdf"></i>
                <a href="#" data-resume-file="${fileName}">View Resume</a>
            `;
            document.getElementById("upload-resume-display-btn").textContent = "Change Resume";
            
            // Also refresh the profile to ensure data consistency
            const profile = await getStudentProfile();
            renderPortfolioDisplay(profile);
        } catch (error) {
            alert("Upload failed: " + error.message);
        }
    });

    // Initialize
    resetAuthFormInputs();
    loginTab.click();
    
    // Initialize Google Sign-In
    // Wait for DOM to be fully loaded before initializing Google Sign-In
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadGoogleSignIn);
    } else {
        // DOM is already fully loaded
        loadGoogleSignIn();
    }
});
