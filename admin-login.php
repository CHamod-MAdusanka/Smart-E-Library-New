<?php
session_start();

// Prevent caching to ensure proper session checks
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Redirect if already logged in
if (isset($_SESSION['admin_id'])) { header("Location: admin-dashboard.php"); exit(); }
if (isset($_SESSION['student_id'])) { header("Location: student-dashboard.php"); exit(); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Smart E-Library</title>
    
    <!-- Link external CSS file -->
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    
    <!-- Anti-autofill workaround (Hidden fields to prevent browser auto-filling unwanted data) -->
    <div class="anti-autofill-hidden">
        <input type="text" tabindex="-1">
        <input type="password" tabindex="-1">
    </div>

    <!-- Top Navigation Bar -->
    <header class="top-bar">
        <nav>
            <a href="index.php">Home</a>
            <span class="divider">|</span>
            <a href="student-login.php">Student</a>
            <span class="divider">|</span>
            <a href="admin-login.php">Admin</a>
        </nav>
    </header>

    <!-- Login Section -->
    <main class="login-wrapper">
        <section class="login-box">
            <h2>Admin Login</h2>
            
            <form id="adminLoginForm" action="php/auth_controller.php?action=admin_login" method="POST">
                
                <!-- Step 1: Enter Admin ID -->
                <div id="step-1">
                    <input type="text" name="adminId" id="adminId" placeholder="Admin ID" autocomplete="new-password" data-lpignore="true" required>
                    <br>
                    <button type="button" id="nextBtn" class="login-btn">Next</button>
                </div>

                <!-- Step 2: Enter Password (Hidden by default) -->
                <div id="step-2" class="hidden-step">
                    <div id="display-id" class="display-user-id"></div>
                    
                    <input type="password" name="adminPassword" id="adminPassword" placeholder="Password" required>
                    <br>
                    <div class="forgot-password">
                        <a href="#" id="forgotPasswordBtn">Forgot Password</a>
                    </div>
                    <button type="submit" class="login-btn">Login</button>
                </div>

            </form>
        </section>
    </main>

    <!-- Link external JavaScript file for login logic -->
    <script src="js/admin-login.js"></script>
</body>
</html>