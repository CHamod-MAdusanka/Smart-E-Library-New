<?php
session_start();
header('Content-Type: application/json');
require 'db_connect.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);
if (empty($action) && isset($data['action'])) { $action = $data['action']; }

switch ($action) {
    // ==========================================
    // === 1. UPDATE PREFERENCES ===
    // ==========================================
    case 'update_preferences':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        if(isset($data['borrow_days']) && isset($data['fine_amount'])) {
            $days = (int)$data['borrow_days'];
            $fine = (float)$data['fine_amount'];
            $stmt = $conn->prepare("UPDATE system_settings SET borrowing_period=?, late_fine=? WHERE id=1");
            $stmt->bind_param("id", $days, $fine);
            if($stmt->execute()) echo json_encode(["status" => "success", "message" => "Library preferences updated successfully!"]);
            else echo json_encode(["status" => "error", "message" => "Failed to update."]);
            $stmt->close();
        } else { echo json_encode(["status" => "error", "message" => "Invalid data."]); }
        break;

    // ==========================================
    // === 2. GET PREFERENCES ===
    // ==========================================
    case 'get_preferences':
        $res = $conn->query("SELECT borrowing_period, late_fine FROM system_settings WHERE id=1");
        if($res && $res->num_rows > 0) echo json_encode(["status" => "success", "data" => $res->fetch_assoc()]);
        else echo json_encode(["status" => "error", "message" => "No settings found."]);
        break;

    // ==========================================
    // === 3. GET DASHBOARD STATS ===
    // ==========================================
    case 'get_dashboard_stats':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $stats = ["total_members" => 0, "pending_approvals" => 0, "total_books" => 0, "books_issued" => 0];
        $res = $conn->query("SELECT count(*) as count FROM students WHERE status='Approved'");
        if ($res) $stats['total_members'] = $res->fetch_assoc()['count'];
        $res = $conn->query("SELECT count(*) as count FROM students WHERE status='Pending'");
        if ($res) $stats['pending_approvals'] = $res->fetch_assoc()['count'];
        $res = $conn->query("SELECT count(*) as count FROM books");
        if ($res) $stats['total_books'] = $res->fetch_assoc()['count'];
        $res = $conn->query("SELECT count(*) as count FROM borrowings WHERE return_date IS NULL");
        if ($res) $stats['books_issued'] = $res->fetch_assoc()['count'];
        echo json_encode(["status" => "success", "data" => $stats]);
        break;

    default:
        echo json_encode(["status" => "error", "message" => "Invalid system action specified."]);
        break;
}
$conn->close();
?>