<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['student_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';

$studentId = $_SESSION['student_id'];
$password = $_POST['password'] ?? '';
$name = $_POST['name'] ?? '';
$email = $_POST['email'] ?? '';
$phone = $_POST['phone'] ?? '';
$dob = $_POST['dob'] ?? '';

// === Profile Update ===
$stmt = $conn->prepare("SELECT password FROM students WHERE student_id = ?");
$stmt->bind_param("s", $studentId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if ($user['password'] !== $password) {
    echo json_encode(["status" => "error", "message" => "Incorrect current password!"]);
    exit();
}


$picPath = null;
if (isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === 0) {
    
    $targetDir = "../uploads/profiles/";
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0777, true);
    }
    
    $fileName = time() . "_" . basename($_FILES["profile_pic"]["name"]);
    $targetFilePath = $targetDir . $fileName;
    
    if (move_uploaded_file($_FILES["profile_pic"]["tmp_name"], $targetFilePath)) {
        $picPath = "uploads/profiles/" . $fileName; 
    }
}


if ($picPath) {
    $update = $conn->prepare("UPDATE students SET full_name=?, email=?, phone=?, dob=?, profile_pic=? WHERE student_id=?");
    $update->bind_param("ssssss", $name, $email, $phone, $dob, $picPath, $studentId);
} else {
    $update = $conn->prepare("UPDATE students SET full_name=?, email=?, phone=?, dob=? WHERE student_id=?");
    $update->bind_param("sssss", $name, $email, $phone, $dob, $studentId);
}

if ($update->execute()) {
    echo json_encode(["status" => "success", "message" => "Profile updated successfully!"]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to update profile."]);
}

$stmt->close();
if(isset($update)) $update->close();
$conn->close();
?>