<?php
session_start();

// Prevent caching so the session state is always checked freshly
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
    <title>Student Login - Smart E-Library</title>
    
    <!-- Link external CSS file -->
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <!-- Top Navigation Bar -->
    <header class="top-bar">
        <nav>
            <a href="index.php">Home</a>
            <span class="divider">|</span>
            <a href="admin-login.php">Admin</a>
        </nav>
    </header>

    <!-- Login Section -->
    <main class="login-wrapper">
        <section class="login-box">
            <h2>Student Login</h2>
            
            <form id="studentLoginForm" action="php/auth_controller.php?action=student_login" method="POST">
                
                <!-- Step 1: Enter Student ID -->
                <div id="step-1">
                    <input type="text" name="studentId" id="studentId" placeholder="Student ID" autocomplete="off" required>
                    <br>
                    <button type="button" id="nextBtn" class="login-btn">Next</button>
                </div>

                <!-- Step 2: Enter Password (Hidden by default) -->
                <div id="step-2" class="hidden-step">
                    <div id="display-id" class="display-user-id"></div>
                    
                    <input type="password" name="studentPassword" id="studentPassword" placeholder="Password" required>
                    <br>
                    <div class="forgot-password">
                        <a href="#" id="forgotPasswordBtn">Forgot Password?</a>
                    </div>
                    <button type="submit" class="login-btn">Login</button>
                </div>

            </form>
            
            <!-- Registration Link -->
            <div class="register-link" id="register-link-container">
                <p><a href="student-register.php">I don't have an account</a></p>
            </div>
        </section>
    </main>

    <!-- Link external JavaScript file for login logic -->
    <script src="js/student-login.js"></script>
</body>
</html>