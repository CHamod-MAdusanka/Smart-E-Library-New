<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) { 
    echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); 
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

$adminId = $_SESSION['admin_id'];
$pass = $data['password'];
$fullName = $data['full_name'];
$email = $data['email'];
$pic = $data['profile_pic'];

// === Profile Update ===
$stmt = $conn->prepare("SELECT password FROM admins WHERE work_id = ?");
$stmt->bind_param("s", $adminId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if($user['password'] !== $pass) {
    echo json_encode(["status" => "error", "message" => "Incorrect current password!"]);
    exit();
}


$nameParts = explode(" ", $fullName, 2);
$fName = $nameParts[0];
$lName = isset($nameParts[1]) ? $nameParts[1] : '';


$update = $conn->prepare("UPDATE admins SET first_name=?, last_name=?, email=?, profile_pic=? WHERE work_id=?");
$update->bind_param("sssss", $fName, $lName, $email, $pic, $adminId);

if($update->execute()) {
    echo json_encode(["status" => "success", "message" => "Profile updated successfully!"]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to update profile."]);
}
$stmt->close(); $update->close(); $conn->close();
?>