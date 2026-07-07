<?php
session_start();
require 'db_connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $studentId = $_POST['studentId'];
    $studentPassword = $_POST['studentPassword'];

    $sql = "SELECT student_id, password FROM students WHERE student_id = ?";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        die("Query preparation failed: " . $conn->error);
    }
    
    $stmt->bind_param("s", $studentId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        
        if ($studentPassword === $user['password']) {
            $_SESSION['student_id'] = $user['student_id'];
            header("Location: ../student-dashboard.html");
            exit();
        } else {
            echo "<script>alert('Incorrect Password!'); window.location.href='../student-login.html';</script>";
        }
    } else {
        echo "<script>alert('Student ID not found!'); window.location.href='../student-login.html';</script>";
    }
    
    $stmt->close();
}
$conn->close();
?>
