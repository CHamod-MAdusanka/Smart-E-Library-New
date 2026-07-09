<?php
session_start();
header('Content-Type: application/json');

// === Access Control ===
if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Not logged in"]);
    exit();
}

require 'db_connect.php';

$adminId = $_SESSION['admin_id'];

// === Profile Lookup ===
$sql = "SELECT work_id, first_name, last_name, email, role, profile_pic FROM admins WHERE work_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $adminId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    
    echo json_encode([
        "status" => "success",
        "data" => [
            "id" => $user['work_id'],
            "name" => $user['first_name'] . " " . $user['last_name'],
            "email" => $user['email'],
            "role" => $user['role'],
            "avatar" => $user['profile_pic']
        ]
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "User not found"]);
}

$stmt->close();
$conn->close();
?>