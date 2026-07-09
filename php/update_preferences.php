<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit();
}
require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

if(isset($data['borrow_days']) && isset($data['fine_amount'])) {
    $days = (int)$data['borrow_days'];
    $fine = (float)$data['fine_amount'];

    $stmt = $conn->prepare("UPDATE system_settings SET borrowing_period=?, late_fine=? WHERE id=1");
    $stmt->bind_param("id", $days, $fine);

    if($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Library preferences updated successfully!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to update."]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Invalid data."]);
}
$conn->close();
?>