<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';

$stats = [
    "total_members" => 0,
    "pending_approvals" => 0,
    "total_books" => 0,
    "books_issued" => 0
];

$res = $conn->query("SELECT count(*) as count FROM students WHERE status='Approved'");
if ($res) $stats['total_members'] = $res->fetch_assoc()['count'];

$res = $conn->query("SELECT count(*) as count FROM students WHERE status='Pending'");
if ($res) $stats['pending_approvals'] = $res->fetch_assoc()['count'];

$res = $conn->query("SELECT count(*) as count FROM books");
if ($res) $stats['total_books'] = $res->fetch_assoc()['count'];

$res = $conn->query("SELECT count(*) as count FROM borrowings WHERE return_date IS NULL");
if ($res) $stats['books_issued'] = $res->fetch_assoc()['count'];

echo json_encode(["status" => "success", "data" => $stats]);
$conn->close();
?>
