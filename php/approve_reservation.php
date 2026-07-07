<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['reservation_id'])) {
    $resId = $data['reservation_id'];

    $stmt = $conn->prepare("UPDATE reservations SET status='Approved' WHERE id=?");
    $stmt->bind_param("i", $resId);
    if($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Reservation approved (ready for pickup)."]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to approve reservation."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request"]);
}
$conn->close();
?>
