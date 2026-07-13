<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "smart_e_library_new";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Database Connection Failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
?>