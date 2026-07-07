<?php
session_start();
require 'db_connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $adminId = $_POST['adminId'];
    $adminPassword = $_POST['adminPassword'];

 
    $sql = "SELECT work_id, password, role FROM admins WHERE work_id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        die("Query preparation failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $adminId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
 
        if ($adminPassword === $user['password']) {
            $_SESSION['admin_id'] = $user['work_id'];
            
        
            if ($user['role'] === 'Head Admin') {
                header("Location: ../head-dashboard.html");
            } else {
                header("Location: ../admin-dashboard.html");
            }
            exit();
            
        } else {
            echo "<script>alert('Incorrect Password!'); window.location.href='../admin-login.html';</script>";
        }
    } else {
        echo "<script>alert('Admin ID not found!'); window.location.href='../admin-login.html';</script>";
    }
    
    $stmt->close();
}
$conn->close();
?>