<?php
session_start();
header('Content-Type: application/json'); // අපි දත්ත යවන්නේ JSON විදිහටයි

// කවුරුහරි ලොග් වෙලා නැතුව මේකට ආවොත් එළවලා දාමු
if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Not logged in"]);
    exit();
}

require 'db_connect.php';

$adminId = $_SESSION['admin_id'];

// ඩේටාබේස් එකෙන් ඇඩ්මින්ගේ විස්තර ගමු
$sql = "SELECT work_id, first_name, last_name, email, role, profile_pic FROM admins WHERE work_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $adminId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $user = $result->fetch_assoc();
    // JS එකට කියවන්න පුළුවන් විදිහට දත්ත ටික පැක් කරලා යවනවා
    echo json_encode([
        "status" => "success",
        "data" => [
            "id" => $user['work_id'],
            "name" => $user['first_name'] . " " . $user['last_name'],
            "email" => $user['email'],
            "role" => $user['role'],
            "avatar" => $user['profile_pic']
        ]
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "User not found"]);
}

$stmt->close();
$conn->close();
?>