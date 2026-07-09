<?php
session_start();
header('Content-Type: application/json');

// === Reservation Management ===
if (!isset($_SESSION['admin_id']) && !isset($_SESSION['student_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['reservation_id'])) {
    $resId = $data['reservation_id'];

    $stmt = $conn->prepare("SELECT book_id FROM reservations WHERE id = ?");
    $stmt->bind_param("i", $resId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if($result->num_rows === 0) {
        echo json_encode(["status" => "error", "message" => "Reservation not found."]);
        exit();
    }
    $bookId = $result->fetch_assoc()['book_id'];

    $conn->begin_transaction();
    try {
        
        $stmt = $conn->prepare("UPDATE books SET status='Available' WHERE book_id=?");
        $stmt->bind_param("s", $bookId);
        $stmt->execute();

        
        $stmt = $conn->prepare("DELETE FROM reservations WHERE id=?");
        $stmt->bind_param("i", $resId);
        $stmt->execute();

        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Reservation cancelled successfully!"]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["status" => "error", "message" => "Failed to cancel reservation."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request"]);
}
$conn->close();
?>
