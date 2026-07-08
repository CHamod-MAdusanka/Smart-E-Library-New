<?php
header('Content-Type: application/json');
require 'db_connect.php';

// JS ninda bandiruva JSON data anna decode maduthade
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['book_id'])) {
    $bookId = $data['book_id'];

    // Database ninda book anna delete maduva SQL query
    $sql = "DELETE FROM books WHERE book_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $bookId);

    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0) {
            echo json_encode(["status" => "success", "message" => "Book successfully removed from the database!"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Error: Book not found in the database."]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Database Error: " . $stmt->error]);
    }
    
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Error: Book ID is missing!"]);
}

$conn->close();
?>