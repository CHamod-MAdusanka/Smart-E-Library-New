<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit();
}
require 'db_connect.php';
$currentAdmin = $_SESSION['admin_id'];

// ගිණුම මකා දමනවා
$stmt = $conn->prepare("DELETE FROM admins WHERE work_id=?");
$stmt->bind_param("s", $currentAdmin);

if($stmt->execute()) {
    session_destroy(); // ලොග් අවුට් කරනවා
    echo json_encode(["status" => "success", "message" => "Your account has been deleted permanently."]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to delete account."]);
}
$stmt->close();
$conn->close();
?>