<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';

$sql = "SELECT student_id, full_name, email, proof_doc FROM students WHERE status = 'Pending'";
$result = $conn->query($sql);

$students = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $students[] = $row;
    }
}

echo json_encode(["status" => "success", "data" => $students]);
$conn->close();
?>
