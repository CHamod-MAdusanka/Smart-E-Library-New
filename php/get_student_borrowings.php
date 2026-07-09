<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['student_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';
$studentId = $_SESSION['student_id'];

$sql = "SELECT b.title, bw.book_id, bw.issue_date, bw.due_date, DATEDIFF(bw.due_date, CURDATE()) as days_left 
        FROM borrowings bw
        JOIN books b ON bw.book_id = b.book_id
        WHERE bw.return_date IS NULL AND bw.student_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $studentId);
$stmt->execute();
$result = $stmt->get_result();

$borrowings = [];
$total_fine = 0;
$max_overdue_days = 0;

if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $days = (int)$row['days_left'];
        $row['overdue_days'] = $days < 0 ? abs($days) : 0;
        $row['fine'] = $row['overdue_days'] * 10;
        
        $total_fine += $row['fine'];
        if($row['overdue_days'] > $max_overdue_days) {
            $max_overdue_days = $row['overdue_days'];
        }
        $borrowings[] = $row;
    }
}

echo json_encode([
    "status" => "success", 
    "data" => $borrowings, 
    "total_fine" => $total_fine, 
    "max_overdue_days" => $max_overdue_days
]);
$stmt->close();
$conn->close();
?>
