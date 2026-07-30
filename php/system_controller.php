<?php
session_start();
header('Content-Type: application/json');
require 'db_connect.php';

function escapeOutput($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function getJsonValue(array $data, string $key, $default = '') {
    return isset($data[$key]) ? $data[$key] : $default;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);
if (empty($action) && isset($data['action'])) { $action = $data['action']; }

switch ($action) {
    // ==========================================
    // === 1. UPDATE PREFERENCES (FIXED) ===
    // ==========================================
    case 'update_preferences':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $adminId = $_SESSION['admin_id'];
        $roleStmt = $conn->prepare("SELECT role FROM admins WHERE work_id = ?");
        $roleStmt->bind_param("s", $adminId);
        $roleStmt->execute();
        $roleResult = $roleStmt->get_result();
        $isHeadAdmin = false;
        if ($roleResult && $roleResult->num_rows === 1) {
            $roleRow = $roleResult->fetch_assoc();
            $isHeadAdmin = ($roleRow['role'] ?? '') === 'Head Admin';
        }
        $roleStmt->close();
        if (!$isHeadAdmin) {
            echo json_encode(["status" => "error", "message" => "Unauthorized: Only Head Admin can update system preferences."]); exit();
        }
        if(isset($data['borrow_days']) && isset($data['fine_amount'])) {
            $days = (int)getJsonValue($data, 'borrow_days', 0);
            $fine = (float)getJsonValue($data, 'fine_amount', 0);
            
            // Database එකේ කලින් Row එකක් තියෙනවද බලනවා
            $check = $conn->query("SELECT id FROM system_settings WHERE id=1");
            
            if($check->num_rows > 0) {
                // තිබුණොත් Update කරනවා
                $stmt = $conn->prepare("UPDATE system_settings SET borrowing_period=?, late_fine=? WHERE id=1");
                $stmt->bind_param("id", $days, $fine);
            } else {
                // තිබ්බේ නැත්නම් අලුතින් Insert කරනවා
                $stmt = $conn->prepare("INSERT INTO system_settings (borrowing_period, late_fine, id) VALUES (?, ?, 1)");
                $stmt->bind_param("id", $days, $fine);
            }

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

        $res = $conn->query("SELECT count(*) as count FROM reservations WHERE status='Pending'");
        if ($res) $stats['pending_reservations'] = $res->fetch_assoc()['count'];

        $res = $conn->query("SELECT count(*) as count FROM borrowings WHERE return_date IS NULL");
        if ($res) $stats['active_borrowings'] = $res->fetch_assoc()['count'];

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
    case 'get_notifications':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $notifs = [];
        $res = $conn->query("SELECT id, type, reference_id, message, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT 50");
        if ($res && $res->num_rows > 0) {
            while($row = $res->fetch_assoc()) { $notifs[] = [
                'id' => (int)$row['id'],
                'type' => escapeOutput($row['type']),
                'reference_id' => escapeOutput($row['reference_id']),
                'message' => escapeOutput($row['message']),
                'is_read' => (int)$row['is_read'],
                'created_at' => escapeOutput($row['created_at'])
            ]; }
        }
        $res2 = $conn->query("SELECT count(*) as count FROM notifications WHERE is_read = 0");
        $unread = ($res2) ? (int)$res2->fetch_assoc()['count'] : 0;
        echo json_encode(["status" => "success", "data" => ["unread_count" => $unread, "notifications" => $notifs]]);
        break;

    // ==========================================
    // === MARK NOTIFICATIONS READ ===
    // ==========================================
    case 'mark_notifications_read':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $conn->query("UPDATE notifications SET is_read = 1 WHERE is_read = 0");
        echo json_encode(["status" => "success", "message" => "Notifications marked as read."]); 
        break;

    // ==========================================
    // === MARK NOTIFICATIONS READ BY TYPE ===
    // ==========================================
    case 'mark_notifications_read_by_type':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $type = getJsonValue($data, 'type', '');
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
        $section = getJsonValue($data, 'section', '');
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