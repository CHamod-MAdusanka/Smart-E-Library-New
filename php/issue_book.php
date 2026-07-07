<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['student_id']) && isset($data['book_id'])) {
    $studentId = $data['student_id'];
    $bookId = $data['book_id'];

    // Ensure student exists and is approved
    $stmt = $conn->prepare("SELECT student_id FROM students WHERE student_id = ? AND status='Approved'");
    $stmt->bind_param("s", $studentId);
    $stmt->execute();
    if($stmt->get_result()->num_rows === 0) {
        echo json_encode(["status" => "error", "message" => "Student not found or not approved."]);
        exit();
    }
    
    // Ensure book is available
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
         echo json_encode(["status" => "error", "message" => "Book is already issued."]);
         exit();
    }
    
    // Issue Book
    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("UPDATE books SET status='Borrowed' WHERE book_id=?");
        $stmt->bind_param("s", $bookId);
        $stmt->execute();

        $stmt = $conn->prepare("INSERT INTO borrowings (student_id, book_id, issue_date, due_date) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))");
        $stmt->bind_param("ss", $studentId, $bookId);
        $stmt->execute();
        
        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Book successfully issued!"]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["status" => "error", "message" => "Failed to issue book: " . $e->getMessage()]);
    }

} else {
    echo json_encode(["status" => "error", "message" => "Invalid request"]);
}
$conn->close();
?>
