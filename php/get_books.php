<?php
header('Content-Type: application/json');
require 'db_connect.php';

$sql = "SELECT * FROM books";
$result = $conn->query($sql);

$books = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $books[] = $row;
    }
}

echo json_encode(["status" => "success", "data" => $books]);
$conn->close();
?>
