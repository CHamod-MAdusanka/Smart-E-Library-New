<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Student Registration - Smart E-Library</title>
    
    <!-- Link external CSS file for styling -->
    <link rel="stylesheet" href="css/style.css">
    <!-- Link Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@900&family=Segoe+UI:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>

    <!-- Top Navigation Bar -->
    <header class="top-bar">
        <nav class="top-bar-content">
            <a href="index.php" class="btn home-btn">Home</a>
            <span class="divider">|</span>
            <a href="student-login.php" class="btn student-btn">Student</a>
            <span class="divider">|</span>
            <a href="admin-login.php" class="btn admin-btn">Admin</a>
        </nav>
    </header>

    <!-- Main Registration Section -->
    <main class="login-wrapper">
        <section class="login-box register-box">
            <h2>Create Account</h2>
            <p class="subtitle">Register to access the Smart E-Library</p>
            
            <!-- Registration Form starts here -->
            <form id="studentRegisterForm" action="php/auth_controller.php?action=register_student" method="POST" enctype="multipart/form-data">
                
                <!-- First Name Input -->
                <div class="form-group">
                    <label for="firstName">First Name</label>
                    <input type="text" name="firstName" id="firstName" placeholder="First Name" required>
                </div>

                <!-- Last Name Input -->
                <div class="form-group">
                    <label for="lastName">Last Name</label>
                    <input type="text" name="lastName" id="lastName" placeholder="Last Name" required>
                </div>

                <!-- Date of Birth Input -->
                <div class="form-group">
                    <label for="dob">Date of Birth</label>
                    <input type="date" name="dob" id="dob" required>
                </div>

                <!-- Gender Dropdown Selection -->
                <div class="form-group">
                    <label for="gender">Gender</label>
                    <select name="gender" id="gender" required>
                        <option value="" disabled selected>Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                </div>

                <!-- Email Input -->
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" name="email" id="email" placeholder="Email" autocomplete="off" data-lpignore="true" required>
                </div>

                <!-- Phone Number Input -->
                <div class="form-group">
                    <label for="phone">Phone Number</label>
                    <input type="tel" name="phone" id="phone" placeholder="07XXXXXXXX" required>
                </div>

                <!-- PDF File Upload (Modern styling) -->
                <div class="form-group file-upload-group">
                    <label for="proofFile">Upload Birth Certificate (Proof) - PDF Only</label>
                    <div class="custom-file-upload">
                        <input type="file" name="proofFile" id="proofFile" accept=".pdf,application/pdf" required>
                    </div>
                    <small class="password-hint">Max file size: 5MB.</small>
                </div>

                <!-- Password Input with Eye Icon -->
                <div class="form-group">
                    <label for="regPassword">Password</label>
                    <div class="password-wrapper">
                        <input type="password" name="password" id="regPassword" placeholder="Password" autocomplete="new-password" required>
                        <!-- Clickable SVG Eye icon to show/hide password -->
                        <span class="toggle-password" onclick="togglePasswordVisibility('regPassword')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </span>
                    </div>
                    <small class="password-hint">Must contain at least 6 characters, one uppercase, one lowercase, one number, and one special character.</small>
                </div>
                
                <!-- Confirm Password Input with Eye Icon -->
                <div class="form-group">
                    <label for="regConfirmPassword">Confirm Password</label>
                    <div class="password-wrapper">
                        <input type="password" id="regConfirmPassword" placeholder="Confirm Password" autocomplete="new-password" required>
                        <!-- Clickable SVG Eye icon to show/hide password -->
                        <span class="toggle-password" onclick="togglePasswordVisibility('regConfirmPassword')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </span>
                    </div>
                </div>

                <!-- Submit Button -->
                <button type="submit" class="login-btn">Register</button>

            </form>
            <!-- End of Registration Form -->
            
            <!-- Link back to login page -->
            <div class="register-link">
                <p>Already have an account? <a href="student-login.php">Login Here</a></p>
            </div>
        </section>
    </main>

    <!-- Link external JavaScript file for logic and validation -->
    <script src="js/student-register.js"></script>
</body>
</html>