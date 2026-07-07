<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['student_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';
$studentId = $_SESSION['student_id'];

$sql = "SELECT r.id, b.title, r.request_date, r.status 
        FROM reservations r
        JOIN books b ON r.book_id = b.book_id
        WHERE r.student_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $studentId);
$stmt->execute();
$result = $stmt->get_result();

$reservations = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $reservations[] = $row;
    }
}

echo json_encode(["status" => "success", "data" => $reservations]);
$stmt->close();
$conn->close();
?>
