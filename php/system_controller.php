<?php
session_start();
header('Content-Type: application/json');
require 'db_connect.php';

// ==========================================
// === Notifications Table Init ===
// ==========================================
// Connected to admin notification endpoints in this file (get_notifications, mark_notifications_read)
$conn->query("CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) DEFAULT NULL,
    reference_id VARCHAR(100) DEFAULT NULL,
    message TEXT DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

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
        $stats = ["total_members" => 0, "pending_approvals" => 0, "total_books" => 0, "books_issued" => 0, "pending_reservations" => 0, "active_borrowings" => 0];
        $res = $conn->query("SELECT count(*) as count FROM students WHERE status='Approved'");
        if ($res) $stats['total_members'] = $res->fetch_assoc()['count'];
        $res = $conn->query("SELECT count(*) as count FROM students WHERE status='Pending'");
        if ($res) $stats['pending_approvals'] = $res->fetch_assoc()['count'];
        $res = $conn->query("SELECT count(*) as count FROM books");
        if ($res) $stats['total_books'] = $res->fetch_assoc()['count'];
        $res = $conn->query("SELECT count(*) as count FROM borrowings WHERE return_date IS NULL");
        if ($res) $stats['books_issued'] = $res->fetch_assoc()['count'];

        // Pending reservations (not yet approved)
        $res = $conn->query("SELECT count(*) as count FROM reservations WHERE status='Pending'");
        if ($res) $stats['pending_reservations'] = $res->fetch_assoc()['count'];

        // Active borrowings count
        $res = $conn->query("SELECT count(*) as count FROM borrowings WHERE return_date IS NULL");
        if ($res) $stats['active_borrowings'] = $res->fetch_assoc()['count'];

        // Unread notification counts for specific sidebar badge sections
        $res = $conn->query("SELECT count(*) as count FROM notifications WHERE is_read = 0");
        if ($res) $stats['unread_notifications'] = $res->fetch_assoc()['count'];
        $res = $conn->query("SELECT count(*) as count FROM notifications WHERE is_read = 0 AND type = 'registration'");
        if ($res) $stats['unread_registrations'] = $res->fetch_assoc()['count'];
        $res = $conn->query("SELECT count(*) as count FROM notifications WHERE is_read = 0 AND type = 'reservation'");
        if ($res) $stats['unread_reservations'] = $res->fetch_assoc()['count'];
        $res = $conn->query("SELECT count(*) as count FROM notifications WHERE is_read = 0 AND type = 'borrow'");
        if ($res) $stats['unread_borrows'] = $res->fetch_assoc()['count'];

        echo json_encode(["status" => "success", "data" => $stats]);
        break;

    // ==========================================
    // === GET NOTIFICATIONS ===
    // ==========================================
    // Connected to `js/app.js` fetchNotifications() to populate bell dropdown
    case 'get_notifications':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $notifs = [];
        $res = $conn->query("SELECT id, type, reference_id, message, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT 50");
        if ($res && $res->num_rows > 0) {
            while($row = $res->fetch_assoc()) { $notifs[] = $row; }
        }
        $res2 = $conn->query("SELECT count(*) as count FROM notifications WHERE is_read = 0");
        $unread = ($res2) ? (int)$res2->fetch_assoc()['count'] : 0;
        echo json_encode(["status" => "success", "data" => ["unread_count" => $unread, "notifications" => $notifs]]);
        break;

    // ==========================================
    // === MARK NOTIFICATIONS READ ===
    // ==========================================
    // Connected to `js/app.js` onBellClick() to clear unread notifications when user opens bell
    case 'mark_notifications_read':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $conn->query("UPDATE notifications SET is_read = 1 WHERE is_read = 0");
        echo json_encode(["status" => "success", "message" => "Notifications marked as read."]); 
        break;

    // ==========================================
    // === MARK NOTIFICATIONS READ BY TYPE ===
    // ==========================================
    // Connected to `js/app.js` when a section is viewed to clear that section's notifications
    case 'mark_notifications_read_by_type':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $type = $data['type'] ?? '';
        if ($type !== '') {
            $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND type = ?");
            $stmt->bind_param("s", $type);
            $stmt->execute();
            $stmt->close();
            echo json_encode(["status" => "success", "message" => "Section notifications marked as read."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Type is required."]);
        }
        break;

    case 'mark_sidebar_seen':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $section = $data['section'] ?? '';
        $type = '';
        switch ($section) {
            case 'pending_registrations': $type = 'registration'; break;
            case 'book_reservations': $type = 'reservation'; break;
            case 'active_borrowings': $type = 'borrow'; break;
        }
        if ($type !== '') {
            $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE is_read = 0 AND type = ?");
            $stmt->bind_param("s", $type);
            $stmt->execute();
            $stmt->close();
            echo json_encode(["status" => "success", "message" => "Sidebar section marked as seen."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Invalid section."]);
        }
        break;

    default:
        echo json_encode(["status" => "error", "message" => "Invalid system action specified."]);
        break;
}
$conn->close();
?>