<?php
// Initialize session and verify admin authentication
session_start();

// Prevent browser caching to fix back-button navigation issues
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

if (!isset($_SESSION['admin_id'])) {
    header('Location: admin-login.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Smart E-Library</title>
    
    <!-- External Stylesheets and Fonts -->
    <link rel="stylesheet" href="css/admin-style.css">
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Roboto+Slab:wght@900&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Top Navigation Header -->
    <div class="dashboard-header">
        <div class="header-left">
            <button id="menu-btn" class="menu-toggle-btn">☰</button>
            <span class="system-name">Smart E-Library</span>
        </div>
        
        <div class="header-center">
            <div class="search-box">
                <input id="global-search" type="text" placeholder="Search..." readonly>
                <span class="search-icon">🔍</span>
            </div>
        </div> 
        
        <div class="header-right">
            <!-- Notifications Dropdown -->
            <div class="dropdown">
                <button class="icon-btn" id="bell-btn">
                    🔔<span class="badge" id="notif-badge" class="hidden-element">0</span>
                </button>
                <div id="notification-dropdown" class="dropdown-content notif-dropdown">
                    <!-- Notifications loaded via JS -->
                </div>
            </div>
            <div id="notification-toast-container" class="toast-container"></div>
            
            <!-- Profile Dropdown -->
            <div class="dropdown">
                <button class="profile-btn" id="profile-dropdown-btn"> 
                    <img id="header-profile-img" src="static/admin.png" alt="Profile" class="profile-img">
                    <span id="header-profile-name">Officer</span>
                </button>               
                <div id="profile-dropdown" class="dropdown-content">
                    <a href="#" id="link-profile-settings">Profile</a>
                    <a href="logout.php">Logout</a>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Dashboard Container -->
    <div class="dashboard-container">        
        <!-- Sidebar Navigation -->
        <div id="sidebar" class="sidebar">
            <h2>Admin Panel</h2>
            <ul class="sidebar-menu">
                <li class="menu-item home-item nav-trigger" data-section="home">
                    <svg class="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 10.5L12 4l9 6.5"></path>
                        <path d="M9 21.5V12h6v9.5"></path>
                        <path d="M21 10.5v10.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5"></path>
                    </svg>
                    Home
                </li>

                <li class="menu-item menu-parent">Manage Students ▾ <span id="badge-manage-students" class="sidebar-badge hidden-element">0</span>
                    <ul class="submenu">
                        <li class="nav-trigger" data-section="view-members"> View All Students</li>
                        <li class="nav-trigger" data-section="approve-registrations"> Approve New Registrations <span id="badge-approvals" class="sidebar-badge hidden-element">0</span></li>
                        <li class="nav-trigger" data-section="remove-member"> Remove Student </li>
                    </ul>
                </li>

                <li class="menu-item menu-parent">Manage Books ▾
                    <ul class="submenu">
                        <li class="nav-trigger" data-section="add-book"> Add New Book</li>
                        <li class="nav-trigger" data-section="remove-book"> Remove Book</li>
                    </ul>
                </li>

                <li class="menu-item nav-trigger" data-section="book-reservations">Book Reservations <span id="badge-reservations" class="sidebar-badge hidden-element">0</span></li>
                <li class="menu-item nav-trigger" data-section="active-books">Active Borrowed Books <span id="badge-active" class="sidebar-badge hidden-element">0</span></li>
                <li class="menu-item nav-trigger" data-section="return-books">Returns Books</li>
                <li class="menu-item settings-item nav-trigger" data-section="settings">⚙️ Settings</li>
            </ul>
        </div>
        
        <!-- Dynamic Content Display Area -->
        <div class="main-content" id="main-display-area">            
            
            <!-- Home Section -->
            <div id="home" class="dynamic-section default-visible-section">
                <div class="dashboard-cards">
                    <div class="card" id="stat-total-members">Total Members: -</div>
                    <div class="card" id="stat-pending-approvals">Pending Approvals: -</div>
                    <div class="card" id="stat-total-books">Total Books: -</div>
                    <div class="card" id="stat-books-issued">Books Issued: -</div>
                </div>
                
                <div class="pro-banner">
                    <div class="pro-banner-text">
                        <h3>System Status: Online</h3>
                        <p>All library services and IoT modules are currently running smoothly.</p>
                    </div>
                    <div class="pro-banner-graphic">
                        <div class="banner-icon-large">📈</div>
                    </div>
                </div>
            </div>

            <!-- Active Borrowed Books Section -->
            <div id="active-books" class="dynamic-section section-hidden">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Active Borrowed Books</h2>
                        <p>Live tracking of all books currently taken by students, including their return countdowns.</p>
                    </div>
                </div>
                <div class="add-officer-panel">
                    <div class="add-officer-card">
                        <div class="table-card">
                            <table class="styled-table">
                                <thead>
                                    <tr>
                                        <th>Book Title</th>
                                        <th>Student Name</th>
                                        <th>Email Address</th>
                                        <th>Time Left to Return</th>
                                    </tr>
                                </thead>
                                <tbody id="active-books-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- View Members Section -->
            <div id="view-members" class="dynamic-section section-hidden">
                <div class="section-header">
                    <div><h2 class="section-title">View All Students</h2></div>
                </div>
                <div class="add-officer-panel">
                    <div class="add-officer-card">
                        <div class="table-card">
                            <table class="styled-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Full Name</th>
                                        <th>Email</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody id="all-students-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Approve Registrations Section -->
            <div id="approve-registrations" class="dynamic-section section-hidden">
                <div class="section-header">
                    <div><h2 class="section-title">Approve New Registrations</h2></div>
                </div>
                <div class="add-officer-panel">
                    <div class="add-officer-card">
                        <div class="table-card">
                            <table class="styled-table">
                                <thead>
                                    <tr>
                                        <th>Full Name</th>
                                        <th>Email Address</th>
                                        <th>Verification Document</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="pending-students-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Remove Member Section -->
            <div id="remove-member" class="dynamic-section section-hidden">
                <div class="section-header">
                    <div><h2 class="section-title">Remove Student</h2></div>
                </div>
                <div class="add-officer-panel">
                    <div class="add-officer-card">
                        <div class="table-card">
                            <table class="styled-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Full Name</th>
                                        <th>Email</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="remove-students-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Add Book Section -->
            <div id="add-book" class="dynamic-section section-hidden">
                <div class="section-header">
                    <div><h2 class="section-title">Add New Book</h2></div>
                </div>
                <div class="add-officer-panel">
                    <div class="add-officer-card">
                        <div class="field-grid">
                            <div class="field-item">
                                <label>Book Title</label>
                                <input id="book-title" type="text" placeholder="Enter book title">
                            </div>
                            <div class="field-item">
                                <label>Author</label>
                                <input id="book-author" type="text" placeholder="Enter author name">
                            </div>
                            <div class="field-item">
                                <label>Category</label>
                                <select id="book-category">
                                    <option value="">Select category</option>
                                    <option value="novel">Novel</option>
                                    <option value="science">Science</option>
                                    <option value="history">History</option>
                                    <option value="education">Education</option>
                                </select>
                            </div>
                            <div class="field-item">
                                <label>Rack Number</label>
                                <input id="book-rack" type="text" placeholder="e.g. r1">
                            </div>
                            <div class="field-item">
                                <label>Book Cover Image</label>
                                <input id="book-cover" type="file" accept="image/png, image/jpeg">
                            </div>
                            <div class="field-item field-full">
                                <label>Book ID</label>
                                <input id="book-id" type="text" readonly placeholder="Automatically generated">
                            </div>
                            <div class="field-item field-full">
                                <button id="book-add-button" type="button" class="btn-save panel-button">+ Add Book</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Book Inventory Directory -->
                <div class="directory-panel">
                    <div class="section-header">
                        <div><h3>Book Inventory</h3></div>
                    </div>
                    <div class="table-card">
                        <table class="styled-table" id="book-inventory-table">
                            <thead>
                                <tr>
                                    <th>Cover</th>
                                    <th>Book ID</th>
                                    <th>Title</th>
                                    <th>Author</th>
                                    <th>Category</th>
                                    <th>QR Code</th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Remove Book Section -->
            <div id="remove-book" class="dynamic-section section-hidden">
                <div class="section-header">
                    <div><h2 class="section-title">Remove Book</h2></div>
                </div>
                <div class="directory-panel">
                    <div class="filter-bar">
                        <select id="remove-book-category" class="filter-select">
                            <option value="all">All Categories</option>
                            <option value="novel">Novel</option>
                            <option value="science">Science</option>
                            <option value="history">History</option>
                            <option value="education">Education</option>
                        </select>
                    </div>
                    <div class="table-card">
                        <table class="styled-table" id="remove-book-table">
                            <thead>
                                <tr>
                                    <th>Cover</th>
                                    <th>Book ID</th>
                                    <th>Book Title</th>
                                    <th>Author</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="remove-book-body">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Book Reservations Section -->
            <div id="book-reservations" class="dynamic-section section-hidden">
                <div class="section-header">
                    <div><h2 class="section-title">Online Book Reservations</h2></div>
                </div>
                <div class="add-officer-panel">
                    <div class="add-officer-card">
                        <div class="table-card">
                            <table class="styled-table">
                                <thead>
                                    <tr>
                                        <th>Student Name</th>
                                        <th>Book Title</th>
                                        <th>Reserved Date</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-reservations-body">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Return Books (QR Scanner) Section -->
            <div id="return-books" class="dynamic-section section-hidden">
                <div class="section-header">
                    <div>
                        <h2 class="section-title">Returns Books (QR Scanner)</h2>
                        <p>Scan a book's QR code to process its return and calculate fines instantly.</p>
                    </div>
                </div>
                <div class="settings-grid scanner-layout-center">
                    <div class="settings-card scanner-card">
                        
                        <!-- Scanner Render Area -->
                        <div id="admin-qr-reader" class="qr-reader-box hidden-element" style="display: none; width: 100%; min-height: 320px; border: 3px solid #3b82f6; border-radius: 8px; margin-bottom: 20px; overflow: hidden;"></div>
                        
                        <!-- Close Scanner Button (Hidden initially) -->
                        <button id="btn-close-scanner" class="btn-danger full-width-btn mb-10" style="display: none;" onclick="stopAdminScanner()">✖ Close Camera</button>
                        
                        <button id="btn-start-scanner" class="btn-approve full-width-btn mb-10">📷 Start Camera Scanner</button>
                        
                        <div class="scanner-divider">
                            <span class="scanner-divider-text">OR</span>
                        </div>
                        
                        <!-- Manual QR Upload Area -->
                        <input type="file" id="qr-upload-file" accept="image/*" class="hidden-element">
                        <button id="btn-upload-qr" class="btn-secondary full-width-btn mt-10 dark-btn">📂 Upload QR Image</button>
                        
                    </div>
                </div>
            </div>

            <!-- System Settings & Profile Section -->
            <div id="settings" class="dynamic-section section-hidden">
                <div class="section-header">
                    <div><h2 class="section-title">System Settings & Profile</h2></div>
                </div>
                
                <div class="settings-grid">
                    
                    <!-- Profile Settings Card -->
                    <div class="settings-card">
                        <h3>My Profile Settings</h3>
                        
                        <div class="profile-preview-container">
                            <img id="settings-profile-preview" src="static/admin.png" alt="Profile Preview" class="profile-preview-img">
                            <h4 class="profile-id-heading">System ID: <span id="settings-profile-id" class="profile-id-text">-</span></h4>
                        </div>

                        <div class="form-style settings-form">
                            <div class="form-group mb-12">
                                <label class="fw-bold mb-5 block">Change Full Name</label>
                                <input type="text" id="profile-name-input" class="filter-input w-90" value="">
                            </div>
                            <div class="form-group mb-12">
                                <label class="fw-bold mb-5 block">Email Address</label>
                                <input type="email" id="profile-email-input" class="filter-input w-90" value="">
                            </div>
                            <div class="form-group mb-15">
                                <label class="fw-bold mb-5 block">Update Profile Avatar</label>
                                <input type="file" id="profile-img-input" accept="image/png, image/jpeg">
                            </div>
                            <button id="btn-update-profile" class="btn-save">Update Profile</button>
                            
                            <hr class="settings-divider">
                            
                            <!-- Password Change UI -->
                            <div id="pw-step-0">
                                <button id="btn-start-pw-change" class="pw-toggle-btn">
                                    <span class="icon-large">🔑</span> Change Security Password
                                </button>
                            </div>

                            <div id="pw-step-1" class="pw-step-card hidden-element">
                                <label class="fw-bold mb-8 block color-dark">Step 1: Enter Current Password</label>
                                
                                <input type="text" name="fake_username_1" class="hidden-element" aria-hidden="true" autocomplete="username">
                                <input type="password" id="pw-current" class="filter-input w-100 mb-10 box-border" placeholder="Type your active password" autocomplete="new-password">
                                
                                <div class="forgot-pw-link">
                                    <a href="forgot-password.php">Forgot Password?</a>
                                </div>
                                <div class="flex-gap-10">
                                    <button id="btn-verify-pw" class="btn-save w-50 p-10 btn-blue">Next</button>
                                    <button class="btn-cancel w-50 p-10 btn-cancel-pw">Cancel</button>
                                </div>
                            </div>

                            <div id="pw-step-2" class="pw-step-card hidden-element">
                                <label class="fw-bold mb-8 block color-dark">Step 2: Enter New Password</label>
                                
                                <input type="text" name="fake_username_2" class="hidden-element" aria-hidden="true" autocomplete="username">
                                <input type="password" id="pw-new" class="filter-input w-100 mb-12 box-border" placeholder="Create new password" autocomplete="new-password">
                                
                                <label class="fw-bold mb-8 block color-dark">Confirm New Password</label>
                                <input type="password" id="pw-confirm" class="filter-input w-100 mb-20 box-border" placeholder="Retype new password" autocomplete="new-password">
                                
                                <div class="flex-gap-10">
                                    <button id="btn-confirm-new-pw" class="btn-save w-50 p-10 btn-green">Confirm</button>
                                    <button class="btn-cancel w-50 p-10 btn-cancel-pw">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Library Preferences Card -->
                    <div class="settings-card">
                        <h3>Library Preferences</h3>
                        <div class="form-style settings-form mt-15">
                            <div class="form-group mb-12">
                                <label class="fw-bold mb-5 block">Borrowing Period (Days)</label>
                                <input type="number" id="pref-days" class="filter-input w-90">
                            </div>
                            <div class="form-group mb-15">
                                <label class="fw-bold mb-5 block">Late Fine Amount (Per Day - LKR)</label>
                                <input type="number" id="pref-fine" class="filter-input w-90">
                            </div>
                        <button id="btn-save-prefs" class="btn-save" onclick="updatePreferences()">Save Preferences</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modals -->
    
    <!-- Return Book Modal -->
    <div id="admin-return-modal" class="modal-overlay">
        <div class="modal-content modal-sm text-center">
            <h3 class="modal-title-blue">Process Return</h3>
            <p><strong>Book:</strong> <span id="ret-book-title"></span> (<span id="ret-book-id"></span>)</p>
            <p><strong>Student:</strong> <span id="ret-student-name"></span> (<span id="ret-student-id"></span>)</p>
            <div class="fine-display-box">
                <p class="fine-text">Fine: Rs. <span id="ret-fine-amount">0.00</span></p>
            </div>
            <div class="modal-actions flex-center gap-15">
                <button id="btn-close-return" class="btn-cancel">Cancel</button>
                <button id="btn-confirm-return" class="btn-save btn-green">Confirm Return</button>
            </div>
        </div>
    </div>

    <!-- Profile Authentication Modal -->
    <div id="profile-auth-modal" class="modal-overlay">
        <div class="modal-content">
            <h3>Security Verification</h3>
            <p>Enter current password to save profile adjustments.</p>
            
            <input type="text" name="fake_username_auth" class="hidden-element" aria-hidden="true" autocomplete="username">
            <input id="profile-auth-password" class="modal-input" type="password" placeholder="Current Password" autocomplete="new-password">
            
            <p id="profile-auth-error" class="error-text hidden-element">Incorrect password! Try again.</p>
            <div class="modal-actions">
                <button id="btn-close-auth" class="btn-cancel">Cancel</button>
                <button id="btn-confirm-auth" class="btn-save btn-green">Confirm</button>
            </div>
        </div>
    </div>

    <!-- Password Success Modal -->
    <div id="pw-success-modal" class="modal-overlay">
        <div class="modal-content modal-success-sm">
            <div class="success-icon">✅</div>
            <h3 class="success-title">Password Changed!</h3>
            <p class="success-desc">Your credentials have been successfully updated.</p>
            <button id="btn-close-success" class="btn-save btn-green w-100 mt-0">OK</button>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js" type="text/javascript"></script>
    <script src="js/app.js"></script>
</body>
</html>