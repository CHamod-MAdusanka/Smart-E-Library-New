<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['student_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['book_id'])) {
    $studentId = $_SESSION['student_id'];
    $bookId = $data['book_id'];

    // === Book Reservation ===
    $stmt = $conn->prepare("SELECT status FROM books WHERE book_id = ?");
    $stmt->bind_param("s", $bookId);
    $stmt->execute();
    $res = $stmt->get_result();
    
    if($res->num_rows === 0) {
        echo json_encode(["status" => "error", "message" => "Book not found."]);
        exit();
    }
    
    $book = $res->fetch_assoc();
    if($book['status'] !== 'Available') {
        echo json_encode(["status" => "error", "message" => "Book is currently not available for reservation."]);
        exit();
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("UPDATE books SET status='Reserved' WHERE book_id=?");
        $stmt->bind_param("s", $bookId);
        $stmt->execute();

        $stmt = $conn->prepare("INSERT INTO reservations (student_id, book_id, request_date, status) VALUES (?, ?, CURDATE(), 'Pending')");
        $stmt->bind_param("ss", $studentId, $bookId);
        $stmt->execute();

        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Book reservation placed successfully!"]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["status" => "error", "message" => "Failed to reserve book."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request"]);
}
$conn->close();
?>
