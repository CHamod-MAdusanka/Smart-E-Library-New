<?php
require 'db_connect.php';
header('Content-Type: application/json');

$res = $conn->query("SELECT borrowing_period, late_fine FROM system_settings WHERE id=1");
if($res->num_rows > 0) {
    echo json_encode(["status" => "success", "data" => $res->fetch_assoc()]);
} else {
    echo json_encode(["status" => "error", "message" => "No settings found."]);
}
$conn->close();
?>