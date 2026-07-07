<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';

$sql = "SELECT r.id, s.full_name, s.student_id, b.title, r.request_date, r.status 
        FROM reservations r
        JOIN books b ON r.book_id = b.book_id
        JOIN students s ON r.student_id = s.student_id";
$result = $conn->query($sql);

$reservations = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $reservations[] = $row;
    }
}

echo json_encode(["status" => "success", "data" => $reservations]);
$conn->close();
?>
