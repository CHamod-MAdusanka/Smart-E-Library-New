<?php
header('Content-Type: application/json');
require_once 'db_connect.php'; 

// admins ටේබල් එකෙන් දත්ත ගන්නවා, හැබැයි 'Head Admin' ව අයින් කරනවා. 
// ඒ වගේම first_name සහ last_name දෙක එකතු කරලා 'full_name' විදිහට ගන්නවා.
$sql = "SELECT work_id, CONCAT(first_name, ' ', last_name) AS full_name, email FROM admins WHERE role != 'Head Admin'";
$result = $conn->query($sql);

$officers = array();
if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $officers[] = $row;
    }
    echo json_encode(['status' => 'success', 'data' => $officers]);
} else {
    echo json_encode(['status' => 'error', 'data' => []]);
}

$conn->close();
?>