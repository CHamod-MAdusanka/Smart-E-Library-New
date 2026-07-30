<?php
// Start the session
session_start();

// Unset all session variables
session_unset();

// Destroy the session completely
session_destroy();

// Prevent browser caching to fix back-button navigation issues
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

// Redirect to the correct PHP login file
header("Location: admin-login.php"); 
exit();
?>