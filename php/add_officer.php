<?php
session_start();
header('Content-Type: application/json');

// === Access Control ===
if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized access!"]);
    exit();
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['work_id']) && isset($data['email'])) {
    $workId = $data['work_id'];
    $firstName = $data['first_name'];
    $lastName = $data['last_name'];
    $email = $data['email'];
    $password = $data['password'];
    $role = "Officer";
    $profilePic = "static/admin.png";

    $checkStmt = $conn->prepare("SELECT work_id FROM admins WHERE work_id = ?");
    $checkStmt->bind_param("s", $workId);
    $checkStmt->execute();
    if($checkStmt->get_result()->num_rows > 0) {
        echo json_encode(["status" => "error", "message" => "This Work ID already exists!"]);
        exit();
    }
    $checkStmt->close();

    
    $sql = "INSERT INTO admins (work_id, first_name, last_name, email, role, profile_pic, password) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssss", $workId, $firstName, $lastName, $email, $role, $profilePic, $password);
    
    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "New Officer account created successfully!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to create account."]);
    }
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Invalid data format!"]);
}
$conn->close();
?>