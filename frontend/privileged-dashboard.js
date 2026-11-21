(function enforceApiBase() {
    const apiOrigin = (window.location.origin.includes(':5005') ? window.location.origin : 'http://localhost:5005');
    const originalFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
        if (typeof input === 'string' && input.startsWith('/api/')) {
            input = apiOrigin + input;
        }
        return originalFetch(input, init);
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already authenticated
    const token = localStorage.getItem('token');
    
    if (token) {
        // User is already logged in, show dashboard
        showDashboard(token);
    } else {
        // No token: redirect to main login page
        window.location.href = 'index.html';
        return;
    }
    
    // Set up logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logoutUser();
        });
    }
});

// Track current user's privileges for UI filtering
let CURRENT_PRIVS = new Set();
// Caches for filtering within modals
let PRIV_STUDENTS_CACHE = [];
let PRIV_COMPANIES_CACHE = [];
let PRIV_INTERNSHIPS_CACHE = [];

// Function to show dashboard
function showDashboard(token) {
    // Show the dashboard container
    document.getElementById('privileged-dashboard').style.display = 'block';
    
    // Load user data and privileges
    loadUserData(token);
    loadUserPrivileges(token);
    loadDashboardStats(token);
}

// Function to load user data
function loadUserData(token) {
    fetch('/api/student/profile', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data && data.name) {
            document.getElementById('user-name').textContent = data.name;
        }
    })
    .catch(error => {
        console.error('Error loading user data:', error);
    });
}

// Function to load user privileges
function loadUserPrivileges(token) {
    fetch('/api/student/privileges', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            try {
                CURRENT_PRIVS = new Set((data.privileges || []).map(p => p.name || p));
            } catch (e) {
                CURRENT_PRIVS = new Set();
            }
            renderUserPrivileges(data.privileges, token);
            applyStatVisibility(false);
        } else {
            throw new Error(data.message || 'Failed to load privileges');
        }
    })
    .catch(error => {
        console.error('Error loading privileges:', error);
        document.getElementById('privileges-container').innerHTML = '<div class="error">Failed to load privileges</div>';
    });
}

// Function to render user privileges
function renderUserPrivileges(privileges, token) {
    const container = document.getElementById('privileges-container');
    
    if (!privileges || privileges.length === 0) {
        container.innerHTML = '<div class="no-privileges">You have no privileges assigned.</div>';
        return;
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Define privilege descriptions and actions
    const privilegeInfo = {
        'manage_students': {
            title: 'Manage Students',
            description: 'Approve or reject student profiles',
            icon: 'fa-user-graduate',
            action: 'manageStudents'
        },
        'manage_companies': {
            title: 'Manage Companies',
            description: 'Approve or reject company profiles',
            icon: 'fa-building',
            action: 'manageCompanies'
        },
        'manage_internships': {
            title: 'Manage Internships',
            description: 'Approve or reject internship postings',
            icon: 'fa-briefcase',
            action: 'manageInternships'
        },
        'manage_admins': {
            title: 'Manage Admins',
            description: 'Grant or revoke privileges to other users',
            icon: 'fa-user-shield',
            action: 'manageAdmins'
        },
        'view_statistics': {
            title: 'View Statistics',
            description: 'View dashboard statistics and reports',
            icon: 'fa-chart-bar',
            action: 'viewStatistics'
        },
        'manage_applications': {
            title: 'Manage Applications',
            description: 'View and manage internship applications',
            icon: 'fa-file-contract',
            action: 'manageApplications'
        }
    };
    
    // Create privilege cards
    privileges.forEach(privilege => {
        const info = privilegeInfo[privilege.name] || {
            title: privilege.name,
            description: privilege.description || 'No description available',
            icon: 'fa-cog',
            action: 'genericAction'
        };
        
        const card = document.createElement('div');
        card.className = 'privilege-card';
        card.innerHTML = `
            <h3><i class="fas ${info.icon}"></i> ${info.title}</h3>
            <p>${info.description}</p>
            <button class="action-btn" data-action="${info.action}">Access</button>
        `;
        
        container.appendChild(card);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.action-btn').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handlePrivilegeAction(action, token);
        });
    });
}

// Show/hide stats tiles based on CURRENT_PRIVS
function applyStatVisibility(forModal = false) {
    const showAll = CURRENT_PRIVS.has('view_statistics');
    const showStudents = showAll || CURRENT_PRIVS.has('manage_students');
    const showCompanies = showAll || CURRENT_PRIVS.has('manage_companies');
    const showInternships = showAll || CURRENT_PRIVS.has('manage_internships');
    const showApplications = showAll || CURRENT_PRIVS.has('manage_applications');

    const ids = forModal ? {
        students: 'modal-total-students',
        companies: 'modal-total-companies',
        internships: 'modal-total-internships',
        applications: 'modal-total-applications'
    } : {
        students: 'total-students',
        companies: 'total-companies',
        internships: 'total-internships',
        applications: 'total-applications'
    };

    const setVisible = (id, visible) => {
        const el = document.getElementById(id);
        if (!el) return;
        const item = el.closest('.stat-item') || el.parentElement;
        if (item) item.style.display = visible ? '' : 'none';
    };

    setVisible(ids.students, showStudents);
    setVisible(ids.companies, showCompanies);
    setVisible(ids.internships, showInternships);
    setVisible(ids.applications, showApplications);
}

// Function to handle privilege actions
function handlePrivilegeAction(action, token) {
    switch(action) {
        case 'manageStudents':
            manageStudents(token);
            break;
        case 'manageCompanies':
            manageCompanies(token);
            break;
        case 'manageInternships':
            manageInternships(token);
            break;
        case 'manageAdmins':
            manageAdmins(token);
            break;
        case 'viewStatistics':
            viewStatistics(token);
            break;
        case 'manageApplications':
            manageApplications(token);
            break;
        default:
            alert('Action not implemented yet');
    }
}

// Function to manage students
function manageStudents(token) {
    // Create a modal or section to manage students
    createModal('Manage Students', `
        <div class="manage-section">
            <h3>Student Management</h3>
            <p>Here you can approve or reject student profiles.</p>
            <div class="form-group">
                <label for="students-status-filter">Status Filter</label>
                <select id="students-status-filter">
                    <option value="all">All</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                </select>
            </div>
            <button id="load-students-btn" class="action-btn">Load Students</button>
            <div id="students-list" class="list-container"></div>
        </div>
    `);
    
    // Add event listener to load students button
    document.getElementById('load-students-btn').addEventListener('click', function() {
        loadStudentsForManagement(token);
    });
    // Bind filter change to re-render
    const sf = document.getElementById('students-status-filter');
    if (sf) sf.addEventListener('change', () => renderStudentsList(PRIV_STUDENTS_CACHE, token));
}

// Function to manage companies
function manageCompanies(token) {
    // Create a modal or section to manage companies
    createModal('Manage Companies', `
        <div class="manage-section">
            <h3>Company Management</h3>
            <p>Here you can approve or reject company profiles.</p>
            <div class="form-group">
                <label for="companies-status-filter">Status Filter</label>
                <select id="companies-status-filter">
                    <option value="all">All</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                </select>
            </div>
            <button id="load-companies-btn" class="action-btn">Load Companies</button>
            <div id="companies-list" class="list-container"></div>
        </div>
    `);
    
    // Add event listener to load companies button
    document.getElementById('load-companies-btn').addEventListener('click', function() {
        loadCompaniesForManagement(token);
    });
    const cf = document.getElementById('companies-status-filter');
    if (cf) cf.addEventListener('change', () => renderCompaniesList(PRIV_COMPANIES_CACHE, token));
}

// Function to manage internships
function manageInternships(token) {
    // Create a modal or section to manage internships
    createModal('Manage Internships', `
        <div class="manage-section">
            <h3>Internship Management</h3>
            <p>Here you can approve or reject internship postings.</p>
            <div class="form-group">
                <label for="internships-status-filter">Status Filter</label>
                <select id="internships-status-filter">
                    <option value="all">All</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                </select>
            </div>
            <button id="load-internships-btn" class="action-btn">Load Internships</button>
            <div id="internships-list" class="list-container"></div>
        </div>
    `);
    
    // Add event listener to load internships button
    document.getElementById('load-internships-btn').addEventListener('click', function() {
        loadInternshipsForManagement(token);
    });
    const inf = document.getElementById('internships-status-filter');
    if (inf) inf.addEventListener('change', () => renderInternshipsList(PRIV_INTERNSHIPS_CACHE, token));
}

// Function to manage admins (grant/revoke privileges)
function manageAdmins(token) {
    // Create a modal or section to manage admins
    createModal('Manage Admins', `
        <div class="manage-section">
            <h3>Admin Management</h3>
            <p>Here you can grant or revoke privileges to other users.</p>
            <div class="form-group">
                <label for="user-email">User Email:</label>
                <input type="email" id="user-email" placeholder="Enter user's email">
            </div>
            <div class="form-group">
                <label for="privilege-select">Select Privilege:</label>
                <select id="privilege-select">
                    <option value="">Select a privilege</option>
                    <option value="manage_students">Manage Students</option>
                    <option value="manage_companies">Manage Companies</option>
                    <option value="manage_internships">Manage Internships</option>
                    <option value="manage_admins">Manage Admins</option>
                    <option value="view_statistics">View Statistics</option>
                    <option value="manage_applications">Manage Applications</option>
                </select>
            </div>
            <button id="grant-privilege-btn" class="action-btn">Grant Privilege</button>
            <button id="revoke-privilege-btn" class="action-btn">Revoke Privilege</button>
        </div>
    `);
    
    // Add event listeners to buttons
    document.getElementById('grant-privilege-btn').addEventListener('click', function() {
        grantPrivilege(token);
    });
    
    document.getElementById('revoke-privilege-btn').addEventListener('click', function() {
        revokePrivilege(token);
    });
}

// Function to view statistics
function viewStatistics(token) {
    // Create a modal or section to view statistics
    createModal('View Statistics', `
        <div class="manage-section">
            <h3>Dashboard Statistics</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-number" id="modal-total-students">0</span>
                    <span class="stat-label">Total Students</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" id="modal-total-companies">0</span>
                    <span class="stat-label">Total Companies</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" id="modal-total-internships">0</span>
                    <span class="stat-label">Total Internships</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number" id="modal-total-applications">0</span>
                    <span class="stat-label">Total Applications</span>
                </div>
            </div>
        </div>
    `);
    
    // Load statistics
    loadDashboardStats(token, true);
}

// Function to manage applications
function manageApplications(token) {
    // Create a modal or section to manage applications
    createModal('Manage Applications', `
        <div class="manage-section">
            <h3>Application Management</h3>
            <p>Here you can view and manage internship applications.</p>
            <button id="load-applications-btn" class="action-btn">Load Applications</button>
            <div id="applications-list" class="list-container"></div>
        </div>
    `);
    
    // Add event listener to load applications button
    document.getElementById('load-applications-btn').addEventListener('click', function() {
        loadApplicationsForManagement(token);
    });
}

// Function to create a modal
function createModal(title, content) {
    // Remove existing modal if any
    const existingModal = document.getElementById('privilege-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'privilege-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.appendChild(modal);
    
    // Add event listener to close button
    document.querySelector('.close-modal').addEventListener('click', function() {
        modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Function to load students for management
function loadStudentsForManagement(token) {
    fetch('/api/admin/students', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            PRIV_STUDENTS_CACHE = data.students || [];
            renderStudentsList(PRIV_STUDENTS_CACHE, token);
        } else {
            throw new Error(data.message || 'Failed to load students');
        }
    })
    .catch(error => {
        console.error('Error loading students:', error);
        document.getElementById('students-list').innerHTML = '<div class="error">Failed to load students</div>';
    });
}

// Function to render students list
function renderStudentsList(students, token) {
    const container = document.getElementById('students-list');
    const filterVal = (document.getElementById('students-status-filter')?.value || 'all').toLowerCase();
    const list = (students || []).filter(s => filterVal === 'all' ? true : (filterVal === 'approved' ? !!s.approved : !s.approved));
    
    if (list.length === 0) {
        container.innerHTML = '<div class="no-results">No students found</div>';
        return;
    }
    
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>University</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    list.forEach(student => {
        tableHTML += `
            <tr>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.university || 'N/A'}</td>
                <td>${student.approved ? 'Approved' : 'Pending'}</td>
                <td>
                    ${student.approved ? 
                        `<button class="action-btn reject-btn" data-student-id="${student.id}">Reject</button>` : 
                        `<button class="action-btn approve-btn" data-student-id="${student.id}">Approve</button>
                         <button class="action-btn remove-btn" data-student-id="${student.id}">Remove</button>`}
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
    
    // Add event listeners to action buttons
    document.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', function() {
            const studentId = this.getAttribute('data-student-id');
            approveStudent(studentId, token);
        });
    });
    
    document.querySelectorAll('.reject-btn').forEach(button => {
        button.addEventListener('click', function() {
            const studentId = this.getAttribute('data-student-id');
            rejectStudent(studentId, token);
        });
    });
    
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            const studentId = this.getAttribute('data-student-id');
            removeStudent(studentId, token);
        });
    });
}

// Function to load companies for management
function loadCompaniesForManagement(token) {
    fetch('/api/admin/companies', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            PRIV_COMPANIES_CACHE = data.companies || [];
            renderCompaniesList(PRIV_COMPANIES_CACHE, token);
        } else {
            throw new Error(data.message || 'Failed to load companies');
        }
    })
    .catch(error => {
        console.error('Error loading companies:', error);
        document.getElementById('companies-list').innerHTML = '<div class="error">Failed to load companies</div>';
    });
}

// Function to render companies list
function renderCompaniesList(companies, token) {
    const container = document.getElementById('companies-list');
    const filterVal = (document.getElementById('companies-status-filter')?.value || 'all').toLowerCase();
    const list = (companies || []).filter(c => filterVal === 'all' ? true : (filterVal === 'approved' ? !!c.approved : !c.approved));
    
    if (list.length === 0) {
        container.innerHTML = '<div class="no-results">No companies found</div>';
        return;
    }
    
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    list.forEach(company => {
        tableHTML += `
            <tr>
                <td>${company.name}</td>
                <td>${company.email}</td>
                <td>${company.address || 'N/A'}</td>
                <td>${company.approved ? 'Approved' : 'Pending'}</td>
                <td>
                    ${company.approved ? 
                        `<button class="action-btn remove-btn" data-company-id="${company.id}">Remove</button>` : 
                        `<button class="action-btn approve-btn" data-company-id="${company.id}">Approve</button>
                         <button class="action-btn remove-btn" data-company-id="${company.id}">Remove</button>`}
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
    
    // Add event listeners to action buttons
    document.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', function() {
            const companyId = this.getAttribute('data-company-id');
            approveCompany(companyId, token);
        });
    });
    
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            const companyId = this.getAttribute('data-company-id');
            removeCompany(companyId, token);
        });
    });
}

// Function to load internships for management
function loadInternshipsForManagement(token) {
    fetch('/api/admin/internships', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            PRIV_INTERNSHIPS_CACHE = data.internships || [];
            renderInternshipsList(PRIV_INTERNSHIPS_CACHE, token);
        } else {
            throw new Error(data.message || 'Failed to load internships');
        }
    })
    .catch(error => {
        console.error('Error loading internships:', error);
        document.getElementById('internships-list').innerHTML = '<div class="error">Failed to load internships</div>';
    });
}

// Function to render internships list
function renderInternshipsList(internships, token) {
    const container = document.getElementById('internships-list');
    const filterVal = (document.getElementById('internships-status-filter')?.value || 'all').toLowerCase();
    const list = (internships || []).filter(i => {
        const approved = (i.status === 'active');
        return filterVal === 'all' ? true : (filterVal === 'approved' ? approved : !approved);
    });
    
    if (list.length === 0) {
        container.innerHTML = '<div class="no-results">No internships found</div>';
        return;
    }
    
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Company</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    list.forEach(internship => {
        tableHTML += `
            <tr>
                <td>${internship.title || 'N/A'}</td>
                <td>${internship.company_name || 'Unknown Company'}</td>
                <td>${internship.type || 'Not specified'}</td>
                <td>${internship.location || 'Not specified'}</td>
                <td>${internship.status === 'active' ? 'Active' : 'Pending'}</td>
                <td>
                    ${internship.status === 'active' ? 
                        `<button class="action-btn reject-btn" data-internship-id="${internship.id}">Reject</button>` : 
                        `<button class="action-btn approve-btn" data-internship-id="${internship.id}">Approve</button>
                         <button class="action-btn remove-btn" data-internship-id="${internship.id}">Remove</button>`}
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
    
    // Add event listeners to action buttons
    document.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', function() {
            const internshipId = this.getAttribute('data-internship-id');
            approveInternship(internshipId, token);
        });
    });
    
    document.querySelectorAll('.reject-btn').forEach(button => {
        button.addEventListener('click', function() {
            const internshipId = this.getAttribute('data-internship-id');
            rejectInternship(internshipId, token);
        });
    });
    
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            const internshipId = this.getAttribute('data-internship-id');
            removeInternship(internshipId, token);
        });
    });
}

// Function to grant privilege
function grantPrivilege(token) {
    const userEmail = document.getElementById('user-email').value;
    const privilegeName = document.getElementById('privilege-select').value;
    
    if (!userEmail || !privilegeName) {
        alert('Please enter both user email and select a privilege');
        return;
    }
    
    // First, find the user by email
    fetch(`/api/admin/users/email/${encodeURIComponent(userEmail)}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.user) {
            // User found, now grant the privilege
            return fetch(`/api/admin/users/${data.user.id}/privileges`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ privilegeName })
            });
        } else {
            throw new Error('User not found');
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Privilege '${privilegeName}' granted successfully to ${userEmail}`);
            // Clear the form
            document.getElementById('user-email').value = '';
            document.getElementById('privilege-select').value = '';
        } else {
            throw new Error(data.message || 'Failed to grant privilege');
        }
    })
    .catch(error => {
        console.error('Error granting privilege:', error);
        alert(error.message || 'Failed to grant privilege. Please try again.');
    });
}

// Function to revoke privilege
function revokePrivilege(token) {
    const userEmail = document.getElementById('user-email').value;
    const privilegeName = document.getElementById('privilege-select').value;
    
    if (!userEmail || !privilegeName) {
        alert('Please enter both user email and select a privilege');
        return;
    }
    
    // First, find the user by email
    fetch(`/api/admin/users/email/${encodeURIComponent(userEmail)}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.user) {
            // User found, now revoke the privilege
            return fetch(`/api/admin/users/${data.user.id}/privileges`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ privilegeName })
            });
        } else {
            throw new Error('User not found');
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Privilege '${privilegeName}' revoked successfully from ${userEmail}`);
            // Clear the form
            document.getElementById('user-email').value = '';
            document.getElementById('privilege-select').value = '';
        } else {
            throw new Error(data.message || 'Failed to revoke privilege');
        }
    })
    .catch(error => {
        console.error('Error revoking privilege:', error);
        alert(error.message || 'Failed to revoke privilege. Please try again.');
    });
}

// Function to load applications for management
function loadApplicationsForManagement(token) {
    fetch('/api/company/applicants', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderApplicationsList(data.applicants, token);
        } else {
            throw new Error(data.message || 'Failed to load applications');
        }
    })
    .catch(error => {
        console.error('Error loading applications:', error);
        document.getElementById('applications-list').innerHTML = '<div class="error">Failed to load applications</div>';
    });
}

// Function to render applications list
function renderApplicationsList(applications, token) {
    const container = document.getElementById('applications-list');
    
    if (!applications || applications.length === 0) {
        container.innerHTML = '<div class="no-results">No applications found</div>';
        return;
    }
    
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Student Name</th>
                    <th>Internship</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    applications.forEach(application => {
        tableHTML += `
            <tr>
                <td>${application.studentName}</td>
                <td>${application.internship_title || 'Unknown Internship'}</td>
                <td>${application.status || 'Pending'}</td>
                <td>
                    ${application.status === 'accepted' ? 
                        `<button class="action-btn reject-btn" data-application-id="${application.id}">Reject</button>` : 
                        `<button class="action-btn approve-btn" data-application-id="${application.id}">Approve</button>
                         <button class="action-btn reject-btn" data-application-id="${application.id}">Reject</button>`}
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
    
    // Add event listeners to action buttons
    document.querySelectorAll('.approve-btn').forEach(button => {
        button.addEventListener('click', function() {
            const applicationId = this.getAttribute('data-application-id');
            approveApplication(applicationId, token);
        });
    });
    
    document.querySelectorAll('.reject-btn').forEach(button => {
        button.addEventListener('click', function() {
            const applicationId = this.getAttribute('data-application-id');
            rejectApplication(applicationId, token);
        });
    });
}

// Function to load dashboard statistics
function loadDashboardStats(token, forModal = false) {
    // For now, we'll use the admin endpoint to get stats
    // In a production environment, you might want a separate endpoint for privileged users
    fetch('/api/admin/dashboard/stats', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && data.stats) {
            if (forModal) {
                document.getElementById('modal-total-students').textContent = data.stats.totalStudents || 0;
                document.getElementById('modal-total-companies').textContent = data.stats.totalCompanies || 0;
                document.getElementById('modal-total-internships').textContent = data.stats.totalInternships || 0;
                document.getElementById('modal-total-applications').textContent = data.stats.totalApplications || 0;
            } else {
                document.getElementById('total-students').textContent = data.stats.totalStudents || 0;
                document.getElementById('total-companies').textContent = data.stats.totalCompanies || 0;
                document.getElementById('total-internships').textContent = data.stats.totalInternships || 0;
                document.getElementById('total-applications').textContent = data.stats.totalApplications || 0;
            }
            applyStatVisibility(!!forModal);
        }
    })
    .catch(error => {
        console.error('Error loading dashboard stats:', error);
    });
}

// Function to approve student
function approveStudent(studentId, token) {
    if (!confirm('Are you sure you want to approve this student?')) {
        return;
    }
    
    fetch(`/api/admin/students/${studentId}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Student approved successfully');
            // Reload students list
            loadStudentsForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to approve student');
        }
    })
    .catch(error => {
        console.error('Error approving student:', error);
        alert('Failed to approve student. Please try again.');
    });
}

// Function to reject student
function rejectStudent(studentId, token) {
    if (!confirm('Are you sure you want to reject this student?')) {
        return;
    }
    
    fetch(`/api/admin/students/${studentId}/reject`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Student rejected successfully');
            // Reload students list
            loadStudentsForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to reject student');
        }
    })
    .catch(error => {
        console.error('Error rejecting student:', error);
        alert('Failed to reject student. Please try again.');
    });
}

// Function to remove student
function removeStudent(studentId, token) {
    if (!confirm('Are you sure you want to remove this student?')) {
        return;
    }
    
    fetch(`/api/admin/students/${studentId}/reject`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Student removed successfully');
            // Reload students list
            loadStudentsForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to remove student');
        }
    })
    .catch(error => {
        console.error('Error removing student:', error);
        alert('Failed to remove student. Please try again.');
    });
}

// Function to approve company
function approveCompany(companyId, token) {
    if (!confirm('Are you sure you want to approve this company?')) {
        return;
    }
    
    fetch(`/api/admin/companies/${companyId}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Company approved successfully');
            // Reload companies list
            loadCompaniesForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to approve company');
        }
    })
    .catch(error => {
        console.error('Error approving company:', error);
        alert('Failed to approve company. Please try again.');
    });
}

// Function to remove company
function removeCompany(companyId, token) {
    if (!confirm('Are you sure you want to remove this company?')) {
        return;
    }
    
    fetch(`/api/admin/companies/${companyId}/remove`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Company removed successfully');
            // Reload companies list
            loadCompaniesForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to remove company');
        }
    })
    .catch(error => {
        console.error('Error removing company:', error);
        alert('Failed to remove company. Please try again.');
    });
}

// Function to approve internship
function approveInternship(internshipId, token) {
    if (!confirm('Are you sure you want to approve this internship?')) {
        return;
    }
    
    fetch(`/api/admin/internships/${internshipId}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Internship approved successfully');
            // Reload internships list
            loadInternshipsForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to approve internship');
        }
    })
    .catch(error => {
        console.error('Error approving internship:', error);
        alert('Failed to approve internship. Please try again.');
    });
}

// Function to reject internship
function rejectInternship(internshipId, token) {
    if (!confirm('Are you sure you want to reject this internship?')) {
        return;
    }
    
    fetch(`/api/admin/internships/${internshipId}/reject`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Internship rejected successfully');
            // Reload internships list
            loadInternshipsForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to reject internship');
        }
    })
    .catch(error => {
        console.error('Error rejecting internship:', error);
        alert('Failed to reject internship. Please try again.');
    });
}

// Function to remove internship
function removeInternship(internshipId, token) {
    if (!confirm('Are you sure you want to remove this internship?')) {
        return;
    }
    
    fetch(`/api/admin/internships/${internshipId}/reject`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Internship removed successfully');
            // Reload internships list
            loadInternshipsForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to remove internship');
        }
    })
    .catch(error => {
        console.error('Error removing internship:', error);
        alert('Failed to remove internship. Please try again.');
    });
}

// Function to approve application
function approveApplication(applicationId, token) {
    if (!confirm('Are you sure you want to approve this application?')) {
        return;
    }
    
    fetch(`/api/company/applications/${applicationId}/accept`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Application approved successfully');
            // Reload applications list
            loadApplicationsForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to approve application');
        }
    })
    .catch(error => {
        console.error('Error approving application:', error);
        alert('Failed to approve application. Please try again.');
    });
}

// Function to reject application
function rejectApplication(applicationId, token) {
    if (!confirm('Are you sure you want to reject this application?')) {
        return;
    }
    
    fetch(`/api/company/applications/${applicationId}/reject`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Application rejected successfully');
            // Reload applications list
            loadApplicationsForManagement(token);
        } else {
            throw new Error(data.message || 'Failed to reject application');
        }
    })
    .catch(error => {
        console.error('Error rejecting application:', error);
        alert('Failed to reject application. Please try again.');
    });
}

// Function to logout user
function logoutUser() {
    localStorage.removeItem('token');
    // Redirect to home page after logout
    window.location.href = 'home.html';
}

// Render a login form for privileged users
function renderPrivilegedLoginUI() {
    // If already present, just show it
    let container = document.getElementById('privileged-login-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'privileged-login-container';
        container.style.minHeight = '100vh';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        container.innerHTML = `
            <div style="background:#fff;padding:32px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.15);width:100%;max-width:380px;">
                <h2 style="margin:0 0 16px 0;color:#333;text-align:center;"><i class="fas fa-user-shield"></i> Privileged Login</h2>
                <div class="form-group">
                    <label for="priv-login-email">Email</label>
                    <input type="email" id="priv-login-email" placeholder="you@example.com">
                </div>
                <div class="form-group">
                    <label for="priv-login-password">Password</label>
                    <input type="password" id="priv-login-password" placeholder="Your password">
                </div>
                <button id="priv-login-btn" class="action-btn" style="width:100%;text-align:center;">Sign In</button>
                <div id="priv-login-error" class="error" style="display:none;margin-top:12px;">Invalid credentials</div>
            </div>
        `;
        document.body.appendChild(container);
        // Wire up button
        const btn = container.querySelector('#priv-login-btn');
        btn.addEventListener('click', handlePrivilegedLogin);
    } else {
        container.style.display = 'flex';
    }
}

// Handle privileged login
function handlePrivilegedLogin() {
    const email = document.getElementById('priv-login-email').value.trim();
    const password = document.getElementById('priv-login-password').value;
    const err = document.getElementById('priv-login-error');
    err.style.display = 'none';
    if (!email || !password) {
        err.textContent = 'Email and password are required';
        err.style.display = 'block';
        return;
    }
    const btn = document.getElementById('priv-login-btn');
    btn.disabled = true;
    btn.textContent = 'Signing in...';
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(r => r.json())
    .then(data => {
        if (!data.success || !data.token) {
            throw new Error(data.message || 'Login failed');
        }
        localStorage.setItem('token', data.token);
        // Hide login and show dashboard
        const container = document.getElementById('privileged-login-container');
        if (container) container.style.display = 'none';
        showDashboard(data.token);
    })
    .catch(e => {
        err.textContent = e.message || 'Login failed';
        err.style.display = 'block';
    })
    .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    });
}