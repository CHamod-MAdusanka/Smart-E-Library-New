<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';

$sql = "SELECT b.title, bw.book_id, s.full_name as student_name, s.phone, bw.due_date, DATEDIFF(bw.due_date, CURDATE()) as days_left 
        FROM borrowings bw
        JOIN books b ON bw.book_id = b.book_id
        JOIN students s ON bw.student_id = s.student_id
        WHERE bw.return_date IS NULL";
$result = $conn->query($sql);

$borrowings = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $days = (int)$row['days_left'];
        $row['overdue_days'] = $days < 0 ? abs($days) : 0;
        $row['fine'] = $row['overdue_days'] * 10; // 10 LKR per day
        $borrowings[] = $row;
    }
}

echo json_encode(["status" => "success", "data" => $borrowings]);
$conn->close();
?>
