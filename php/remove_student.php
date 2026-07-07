<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['student_id'])) {
    $studentId = $data['student_id'];
    $sql = "DELETE FROM students WHERE student_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $studentId);
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Student removed successfully"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to remove student"]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request"]);
}
$conn->close();
?>
