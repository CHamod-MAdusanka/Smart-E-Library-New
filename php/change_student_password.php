<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['student_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit();
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

$studentId = $_SESSION['student_id'];
$curr = $data['current_password'];
$new = $data['new_password'];

// === Password Update ===
$stmt = $conn->prepare("SELECT password FROM students WHERE student_id = ?");
$stmt->bind_param("s", $studentId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if($user['password'] !== $curr) {
    echo json_encode(["status" => "error", "message" => "Incorrect current password!"]);
    exit();
}


$update = $conn->prepare("UPDATE students SET password=? WHERE student_id=?");
$update->bind_param("ss", $new, $studentId);

if($update->execute()) {
    echo json_encode(["status" => "success", "message" => "Password changed securely!"]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to change password."]);
}
$stmt->close(); $update->close(); $conn->close();
?>