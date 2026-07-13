<?php
session_start();
header('Content-Type: application/json');
require 'db_connect.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);
if (empty($action) && isset($data['action'])) { $action = $data['action']; }

switch ($action) {
    // ==========================================
    // === 1. ADD BOOK ===
    // ==========================================
    case 'add_book':
        $bookId = $data['book_id']; $title = $data['title']; $author = $data['author'];
        $category = $data['category']; $coverData = $data['cover_img']; 
        $status = "Available"; $dateAdded = date("Y-m-d"); $coverPath = "static/covers/default.png"; 

        if ($coverData != null && strpos($coverData, 'data:image') === 0) {
            $image_parts = explode(";base64,", $coverData);
            $image_type_aux = explode("image/", $image_parts[0]);
            $image_type = $image_type_aux[1];
            $image_base64 = base64_decode($image_parts[1]);
            $fileName = $bookId . '_' . time() . '.' . $image_type;
            $filePath = '../static/covers/' . $fileName; 
            if(file_put_contents($filePath, $image_base64)){ $coverPath = 'static/covers/' . $fileName; }
        }
        $sql = "INSERT INTO books (book_id, title, author, category, status, cover_img, date_added) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssssss", $bookId, $title, $author, $category, $status, $coverPath, $dateAdded);
        if ($stmt->execute()) echo json_encode(["status" => "success", "message" => "Success: New book added to the database!"]);
        else echo json_encode(["status" => "error", "message" => "Database Error: " . $stmt->error]);
        $stmt->close();
        break;

    // ==========================================
    // === 2. REMOVE BOOK ===
    // ==========================================
    case 'remove_book':
        $bookId = $data['book_id'];
        $stmt = $conn->prepare("DELETE FROM books WHERE book_id = ?");
        $stmt->bind_param("s", $bookId);
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) echo json_encode(["status" => "success", "message" => "Book successfully removed from the database!"]);
            else echo json_encode(["status" => "error", "message" => "Error: Book not found in the database."]);
        } else echo json_encode(["status" => "error", "message" => "Database Error: " . $stmt->error]);
        $stmt->close();
        break;

    // ==========================================
    // === 3. ISSUE BOOK ===
    // ==========================================
    case 'issue_book':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $data['student_id']; $bookId = $data['book_id'];
        $stmt = $conn->prepare("SELECT student_id FROM students WHERE student_id = ? AND status='Approved'");
        $stmt->bind_param("s", $studentId); $stmt->execute();
        if($stmt->get_result()->num_rows === 0) { echo json_encode(["status" => "error", "message" => "Student not found or not approved."]); exit(); }
        
        $stmt = $conn->prepare("SELECT status FROM books WHERE book_id = ?");
        $stmt->bind_param("s", $bookId); $stmt->execute();
        $res = $stmt->get_result();
        if($res->num_rows === 0) { echo json_encode(["status" => "error", "message" => "Book not found."]); exit(); }
        if($res->fetch_assoc()['status'] !== 'Available') { echo json_encode(["status" => "error", "message" => "Book is already issued."]); exit(); }
        
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("UPDATE books SET status='Borrowed' WHERE book_id=?");
            $stmt->bind_param("s", $bookId); $stmt->execute();
            $stmt = $conn->prepare("INSERT INTO borrowings (student_id, book_id, issue_date, due_date) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))");
            $stmt->bind_param("ss", $studentId, $bookId); $stmt->execute();
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Book successfully issued!"]);
        } catch (Exception $e) {
            $conn->rollback(); echo json_encode(["status" => "error", "message" => "Failed to issue book: " . $e->getMessage()]);
        }
        break;

    // ==========================================
    // === 4. GET ACTIVE BORROWINGS (ADMIN) ===
    // ==========================================
    case 'get_active_borrowings':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $sql = "SELECT b.title, bw.book_id, s.full_name as student_name, s.phone, bw.due_date, DATEDIFF(bw.due_date, CURDATE()) as days_left 
                FROM borrowings bw JOIN books b ON bw.book_id = b.book_id JOIN students s ON bw.student_id = s.student_id WHERE bw.return_date IS NULL";
        $result = $conn->query($sql);
        $borrowings = [];
        if ($result && $result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $days = (int)$row['days_left'];
                $row['overdue_days'] = $days < 0 ? abs($days) : 0;
                $row['fine'] = $row['overdue_days'] * 10;
                $borrowings[] = $row;
            }
        }
        echo json_encode(["status" => "success", "data" => $borrowings]);
        break;

    // ==========================================
    // === 5. GET STUDENT BORROWINGS ===
    // ==========================================
    case 'get_student_borrowings':
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id'];
        $sql = "SELECT b.title, bw.book_id, bw.issue_date, bw.due_date, DATEDIFF(bw.due_date, CURDATE()) as days_left 
                FROM borrowings bw JOIN books b ON bw.book_id = b.book_id WHERE bw.return_date IS NULL AND bw.student_id = ?";
        $stmt = $conn->prepare($sql); $stmt->bind_param("s", $studentId); $stmt->execute();
        $result = $stmt->get_result();
        $borrowings = []; $total_fine = 0; $max_overdue_days = 0;
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $days = (int)$row['days_left'];
                $row['overdue_days'] = $days < 0 ? abs($days) : 0;
                $row['fine'] = $row['overdue_days'] * 10;
                $total_fine += $row['fine'];
                if($row['overdue_days'] > $max_overdue_days) { $max_overdue_days = $row['overdue_days']; }
                $borrowings[] = $row;
            }
        }
        echo json_encode(["status" => "success", "data" => $borrowings, "total_fine" => $total_fine, "max_overdue_days" => $max_overdue_days]);
        $stmt->close();
        break;

    // ==========================================
    // === 6. RESERVE BOOK ===
    // ==========================================
    case 'reserve_book':
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id']; $bookId = $data['book_id'];
        $stmt = $conn->prepare("SELECT status FROM books WHERE book_id = ?");
        $stmt->bind_param("s", $bookId); $stmt->execute(); $res = $stmt->get_result();
        if($res->num_rows === 0) { echo json_encode(["status" => "error", "message" => "Book not found."]); exit(); }
        if($res->fetch_assoc()['status'] !== 'Available') { echo json_encode(["status" => "error", "message" => "Book is currently not available for reservation."]); exit(); }
        
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("UPDATE books SET status='Reserved' WHERE book_id=?");
            $stmt->bind_param("s", $bookId); $stmt->execute();
            $stmt = $conn->prepare("INSERT INTO reservations (student_id, book_id, request_date, status) VALUES (?, ?, CURDATE(), 'Pending')");
            $stmt->bind_param("ss", $studentId, $bookId); $stmt->execute();
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Book reservation placed successfully!"]);
        } catch (Exception $e) { $conn->rollback(); echo json_encode(["status" => "error", "message" => "Failed to reserve book."]); }
        break;

    // ==========================================
    // === 7. APPROVE RESERVATION (ADMIN) ===
    // ==========================================
    case 'approve_reservation':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $resId = $data['reservation_id'];
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("SELECT student_id, book_id FROM reservations WHERE id=?");
            $stmt->bind_param("i", $resId); $stmt->execute(); $res = $stmt->get_result();
            if($res->num_rows === 0) throw new Exception("Reservation not found.");
            $row = $res->fetch_assoc(); $studentId = $row['student_id']; $bookId = $row['book_id'];
            
            $stmt2 = $conn->prepare("INSERT INTO borrowings (student_id, book_id, issue_date, due_date) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))");
            $stmt2->bind_param("ss", $studentId, $bookId); $stmt2->execute();
            
            $stmt3 = $conn->prepare("UPDATE books SET status='Borrowed' WHERE book_id=?");
            $stmt3->bind_param("s", $bookId); $stmt3->execute();
            
            $stmt4 = $conn->prepare("DELETE FROM reservations WHERE id=?");
            $stmt4->bind_param("i", $resId); $stmt4->execute();
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Request Approved! Book successfully issued for 14 days."]);
        } catch (Exception $e) { $conn->rollback(); echo json_encode(["status" => "error", "message" => "Failed: " . $e->getMessage()]); }
        break;

    // ==========================================
    // === 8. CANCEL RESERVATION ===
    // ==========================================
    case 'cancel_reservation':
        if (!isset($_SESSION['admin_id']) && !isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $resId = $data['reservation_id'];
        $stmt = $conn->prepare("SELECT book_id FROM reservations WHERE id = ?");
        $stmt->bind_param("i", $resId); $stmt->execute(); $result = $stmt->get_result();
        if($result->num_rows === 0) { echo json_encode(["status" => "error", "message" => "Reservation not found."]); exit(); }
        $bookId = $result->fetch_assoc()['book_id'];
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("UPDATE books SET status='Available' WHERE book_id=?");
            $stmt->bind_param("s", $bookId); $stmt->execute();
            $stmt = $conn->prepare("DELETE FROM reservations WHERE id=?");
            $stmt->bind_param("i", $resId); $stmt->execute();
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Reservation cancelled successfully!"]);
        } catch (Exception $e) { $conn->rollback(); echo json_encode(["status" => "error", "message" => "Failed to cancel reservation."]); }
        break;

    // ==========================================
    // === 9. SUBMIT SCAN REQUEST (STUDENT) ===
    // ==========================================
    case 'submit_scan_request':
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id']; $bookId = $data['book_id'];
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("SELECT status FROM books WHERE book_id=?");
            $stmt->bind_param("s", $bookId); $stmt->execute(); $res = $stmt->get_result();
            if($res->num_rows === 0) throw new Exception("Book not found in library.");
            if($res->fetch_assoc()['status'] !== 'Available') throw new Exception("Book is currently not available.");
            
            $stmt2 = $conn->prepare("INSERT INTO scan_requests (student_id, book_id, status) VALUES (?, ?, 'Pending')");
            $stmt2->bind_param("ss", $studentId, $bookId); $stmt2->execute();
            
            $stmt3 = $conn->prepare("UPDATE books SET status='Reserved' WHERE book_id=?");
            $stmt3->bind_param("s", $bookId); $stmt3->execute();
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Scan request sent to Admin successfully!"]);
        } catch (Exception $e) { $conn->rollback(); echo json_encode(["status" => "error", "message" => $e->getMessage()]); }
        break;

    // ==========================================
    // === 10. APPROVE SCAN REQUEST (ADMIN) ===
    // ==========================================
    case 'approve_scan_request':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $reqId = $data['request_id'];
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("SELECT student_id, book_id FROM scan_requests WHERE id=?");
            $stmt->bind_param("i", $reqId); $stmt->execute(); $res = $stmt->get_result();
            if($res->num_rows === 0) throw new Exception("Scan request not found.");
            $row = $res->fetch_assoc(); $studentId = $row['student_id']; $bookId = $row['book_id'];
            
            $stmt2 = $conn->prepare("INSERT INTO borrowings (student_id, book_id, issue_date, due_date) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))");
            $stmt2->bind_param("ss", $studentId, $bookId); $stmt2->execute();
            
            $stmt3 = $conn->prepare("UPDATE books SET status='Borrowed' WHERE book_id=?");
            $stmt3->bind_param("s", $bookId); $stmt3->execute();
            
            $stmt4 = $conn->prepare("DELETE FROM scan_requests WHERE id=?");
            $stmt4->bind_param("i", $reqId); $stmt4->execute();
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Scan request approved! Book issued for 14 days."]);
        } catch (Exception $e) { $conn->rollback(); echo json_encode(["status" => "error", "message" => "Error issuing book: " . $e->getMessage()]); }
        break;

    // ==========================================
    // === 11. GET ALL BOOKS ===
    // ==========================================
    case 'get_books':
        $result = $conn->query("SELECT * FROM books");
        $books = [];
        if ($result && $result->num_rows > 0) { while($row = $result->fetch_assoc()) { $books[] = $row; } }
        echo json_encode(["status" => "success", "data" => $books]);
        break;

    // ==========================================
    // === 12. GET ADMIN RESERVATIONS ===
    // ==========================================
    case 'get_admin_reservations':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $sql = "SELECT r.id, s.full_name, s.student_id, b.title, r.request_date, r.status FROM reservations r JOIN books b ON r.book_id = b.book_id JOIN students s ON r.student_id = s.student_id";
        $result = $conn->query($sql);
        $reservations = [];
        if ($result && $result->num_rows > 0) { while($row = $result->fetch_assoc()) { $reservations[] = $row; } }
        echo json_encode(["status" => "success", "data" => $reservations]);
        break;

    // ==========================================
    // === 13. GET STUDENT RESERVATIONS ===
    // ==========================================
    case 'get_student_reservations':
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id'];
        $sql = "SELECT r.id, b.title, r.request_date, r.status FROM reservations r JOIN books b ON r.book_id = b.book_id WHERE r.student_id = ?";
        $stmt = $conn->prepare($sql); $stmt->bind_param("s", $studentId); $stmt->execute();
        $result = $stmt->get_result();
        $reservations = [];
        if ($result->num_rows > 0) { while($row = $result->fetch_assoc()) { $reservations[] = $row; } }
        echo json_encode(["status" => "success", "data" => $reservations]);
        $stmt->close();
        break;

    // ==========================================
    // === 14. GET SCAN REQUESTS (ADMIN) ===
    // ==========================================
    case 'get_scan_requests':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $query = "SELECT sr.id, sr.student_id, s.full_name as student_name, sr.book_id, b.title as book_title, DATE_FORMAT(sr.request_time, '%Y-%m-%d %H:%i') as request_time 
                FROM scan_requests sr JOIN students s ON sr.student_id = s.student_id JOIN books b ON sr.book_id = b.book_id WHERE sr.status = 'Pending' ORDER BY sr.request_time DESC";
        $result = $conn->query($query);
        $requests = [];
        if ($result && $result->num_rows > 0) { while($row = $result->fetch_assoc()) { $requests[] = $row; } }
        echo json_encode(["status" => "success", "data" => $requests]);
        break;

    default:
        echo json_encode(["status" => "error", "message" => "Invalid library action specified."]);
        break;
}
$conn->close();
?>