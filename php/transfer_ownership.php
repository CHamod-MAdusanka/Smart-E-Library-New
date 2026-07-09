<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit();
}
require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

if(isset($data['new_head_id'])) {
    $currentAdmin = $_SESSION['admin_id'];
    $newHead = $data['new_head_id'];

    $conn->begin_transaction();
    try {
        $stmt1 = $conn->prepare("UPDATE admins SET role='Head Admin' WHERE work_id=?");
        $stmt1->bind_param("s", $newHead);
        $stmt1->execute();

        
        $stmt2 = $conn->prepare("UPDATE admins SET role='Officer' WHERE work_id=?");
        $stmt2->bind_param("s", $currentAdmin);
        $stmt2->execute();

        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Ownership transferred successfully! You have been logged out as Head Admin."]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["status" => "error", "message" => "Transfer failed."]);
    }
}
$conn->close();
?>