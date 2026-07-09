<?php
session_start();
header('Content-Type: application/json');

// === Access Control ===
if (!isset($_SESSION['student_id'])) {
    echo json_encode(["status" => "error", "message" => "Not logged in"]);
    exit();
}

require 'db_connect.php';

$studentId = $_SESSION['student_id'];

// === Student Profile Lookup ===
$sql = "SELECT student_id, full_name, email, phone, dob, profile_pic FROM students WHERE student_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $studentId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    echo json_encode([
        "status" => "success",
        "data" => [
            "id" => $user['student_id'],
            "name" => $user['full_name'],
            "email" => $user['email'],
            "phone" => $user['phone'],
            "dob" => $user['dob'],
            "avatar" => $user['profile_pic'] ? $user['profile_pic'] : 'static/chamod.png' 
        ]
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Student not found"]);
}

$stmt->close();
$conn->close();
?>