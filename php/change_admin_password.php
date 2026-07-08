<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) { 
    echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); 
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

$adminId = $_SESSION['admin_id'];
$curr = $data['current_password'];
$new = $data['new_password'];

// පරණ Password එක හරිද බලනවා
$stmt = $conn->prepare("SELECT password FROM admins WHERE work_id = ?");
$stmt->bind_param("s", $adminId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if($user['password'] !== $curr) {
    echo json_encode(["status" => "error", "message" => "Incorrect current password!"]);
    exit();
}

// අලුත් Password එක සේව් කරනවා
$update = $conn->prepare("UPDATE admins SET password=? WHERE work_id=?");
$update->bind_param("ss", $new, $adminId);

if($update->execute()) {
    echo json_encode(["status" => "success", "message" => "Password changed securely!"]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to change password."]);
}
$stmt->close(); $update->close(); $conn->close();
?>