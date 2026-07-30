<?php
session_start();

// Prevent caching to ensure session redirection works if user clicks 'back'
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

// Redirect if already logged in (Admin or Student)
if (isset($_SESSION['admin_id'])) { header("Location: admin-dashboard.php"); exit(); }
if (isset($_SESSION['student_id'])) { header("Location: student-dashboard.php"); exit(); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart E-Library</title>

    <!-- Link external CSS file -->
    <link rel="stylesheet" href="css/style.css">

    <!-- Link Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Roboto+Slab:wght@900&display=swap" rel="stylesheet">
</head>
<body>

    <!-- Top Navigation Bar -->
    <header class="top-bar">
        <!-- Navigation Links -->
        <nav class="top-bar-content">
            <a href="student-login.php" class="btn student-btn">Student</a>
            <span class="divider">|</span>
            <a href="admin-login.php" class="btn admin-btn">Admin</a>
        </nav>
    </header>

    <!-- Hero Section / Main View -->
    <main class="hero">
        <h1>
            <i class="welcome-text">WELCOME to </i><br>
            Smart E-Library
        </h1>
    </main>

</body>
</html>