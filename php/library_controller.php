<?php
session_start();
header('Content-Type: application/json');
require 'db_connect.php';

// --- 1. Security Helper Functions ---

function getJsonValue($dataArray, $key, $defaultValue = '') {
    return isset($dataArray[$key]) ? $dataArray[$key] : $defaultValue;
}

function escapeOutput($string) {
    if (is_null($string)) return null;
    return htmlspecialchars((string)$string, ENT_QUOTES, 'UTF-8');
}

function requirePostMethod() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode(["status" => "error", "message" => "Invalid Request Method. POST required."]);
        exit();
    }
}

// --- Dynamic Settings ගන්න අලුත් Function එක ---
function getSystemSettings($conn) {
    // Default අගයන් (Database එකෙන් ගන්න බැරි වුණොත්)
    $settings = ['fine_rate' => 10.0, 'borrowing_period' => 14]; 
    
    // ඔයාගේ Database එකේ තියෙන 'system_settings' table එකෙන් ගන්නවා
    $res = $conn->query("SELECT late_fine, borrowing_period FROM system_settings LIMIT 1");
    
    if ($res && $res->num_rows > 0) {
        $row = $res->fetch_assoc();
        if (isset($row['late_fine']) && is_numeric($row['late_fine'])) {
            $settings['fine_rate'] = (float)$row['late_fine'];
        }
        if (isset($row['borrowing_period']) && is_numeric($row['borrowing_period'])) {
            $settings['borrowing_period'] = (int)$row['borrowing_period'];
        }
    }
    return $settings;
}

$action = $_GET['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);
if (empty($action) && isset($data['action'])) { $action = $data['action']; }

switch ($action) {
    case 'add_book':
        requirePostMethod();
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        
        $bookId = getJsonValue($data, 'book_id', ''); 
        $title = getJsonValue($data, 'title', ''); 
        $author = getJsonValue($data, 'author', '');
        $category = getJsonValue($data, 'category', ''); 
        $coverData = getJsonValue($data, 'cover_img', null);
        
        $status = "Available"; 
        $dateAdded = date("Y-m-d"); 
        $coverPath = "static/covers/default.png"; 
        
        if (!empty($coverData) && preg_match('/^data:image\/(\w+);base64,/', $coverData, $type)) {
            $base64Data = substr($coverData, strpos($coverData, ',') + 1);
            $decodedData = base64_decode($base64Data);
            
            if ($decodedData !== false) {
                $finfo = finfo_open();
                $mime_type = finfo_buffer($finfo, $decodedData, FILEINFO_MIME_TYPE);
                finfo_close($finfo);
                
                $allowed_mimes = ['image/jpeg' => 'jpg', 'image/png' => 'png'];
                if (array_key_exists($mime_type, $allowed_mimes)) {
                    $extension = $allowed_mimes[$mime_type];
                    $fileName = $bookId . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
                    $filePath = '../static/covers/' . $fileName; 
                    if(file_put_contents($filePath, $decodedData)){ 
                        $coverPath = 'static/covers/' . $fileName; 
                    }
                } else {
                    echo json_encode(["status" => "error", "message" => "Invalid image format. Only JPG and PNG are allowed."]);
                    exit();
                }
            }
        }

        $stmt = $conn->prepare("INSERT INTO books (book_id, title, author, category, status, cover_img, date_added) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("sssssss", $bookId, $title, $author, $category, $status, $coverPath, $dateAdded);
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Success: New book added!"]);
        } else {
            error_log("DB Error in add_book: " . $stmt->error); 
            echo json_encode(["status" => "error", "message" => "System Error: Could not add the book."]);
        }
        $stmt->close();
        break;

    case 'remove_book':
        requirePostMethod();
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        
        $bookId = $data['book_id'];

        $checkQuery = $conn->prepare("SELECT * FROM borrowings WHERE book_id=? AND return_date IS NULL");
        $checkQuery->bind_param("s", $bookId);
        $checkQuery->execute();
        $result = $checkQuery->get_result();
        
        if ($result->num_rows > 0) {
            echo json_encode(['status' => 'error', 'message' => 'Cannot remove! This book is currently borrowed by a student. Please process the return first.']);
            $checkQuery->close();
            exit();
        }
        $checkQuery->close();

        $conn->begin_transaction();
        try {
            $stmt1 = $conn->prepare("DELETE FROM reservations WHERE book_id=?");
            $stmt1->bind_param("s", $bookId);
            $stmt1->execute();
            $stmt1->close();

            $stmt2 = $conn->prepare("DELETE FROM books WHERE book_id=?");
            $stmt2->bind_param("s", $bookId);
            $stmt2->execute();
            
            if ($stmt2->affected_rows > 0) {
                $conn->commit();
                echo json_encode(["status" => "success", "message" => "Book successfully removed!"]);
            } else {
                $conn->rollback();
                echo json_encode(["status" => "error", "message" => "Error: Book not found."]);
            }
            $stmt2->close();
        } catch (Exception $e) {
            $conn->rollback();
            error_log("DB Error in remove_book: " . $e->getMessage());
            echo json_encode(["status" => "error", "message" => "System Error: Could not remove the book."]);
        }
        break;

    case 'get_active_borrowings':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        
        $sysSettings = getSystemSettings($conn);
        $fine_rate = $sysSettings['fine_rate'];

        $sql = "SELECT b.title, bw.book_id, s.full_name as student_name, s.email, bw.due_date, DATEDIFF(CURDATE(), bw.due_date) as overdue_days 
                FROM borrowings bw JOIN books b ON bw.book_id = b.book_id JOIN students s ON bw.student_id = s.student_id WHERE bw.return_date IS NULL";
        $result = $conn->query($sql);
        $borrowings = [];
        if ($result && $result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $days = (int)$row['overdue_days'];
                $overdue_days = $days > 0 ? $days : 0;
                
                $borrowings[] = [
                    'title' => escapeOutput($row['title']),
                    'book_id' => escapeOutput($row['book_id']),
                    'student_name' => escapeOutput($row['student_name']),
                    'email' => escapeOutput($row['email']),
                    'due_date' => escapeOutput($row['due_date']),
                    'overdue_days' => $overdue_days,
                    'fine' => $overdue_days * $fine_rate // Dynamic calculation
                ];
            }
        }
        echo json_encode(["status" => "success", "data" => $borrowings]);
        break;

    case 'get_student_borrowings':
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id'];
        
        $sysSettings = getSystemSettings($conn);
        $fine_rate = $sysSettings['fine_rate'];

        $sql = "SELECT b.title, bw.book_id, bw.issue_date, bw.due_date, DATEDIFF(CURDATE(), bw.due_date) as overdue_days 
                FROM borrowings bw JOIN books b ON bw.book_id = b.book_id WHERE bw.return_date IS NULL AND bw.student_id = ?";
        $stmt = $conn->prepare($sql); $stmt->bind_param("s", $studentId); $stmt->execute();
        $result = $stmt->get_result();
        $borrowings = []; $total_fine = 0; $max_overdue_days = 0;
        
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $days = (int)$row['overdue_days'];
                $overdue_days = $days > 0 ? $days : 0;
                $fine = $overdue_days * $fine_rate;
                
                $total_fine += $fine;
                if($overdue_days > $max_overdue_days) { $max_overdue_days = $overdue_days; }
                
                $borrowings[] = [
                    'title' => escapeOutput($row['title']),
                    'book_id' => escapeOutput($row['book_id']),
                    'issue_date' => escapeOutput($row['issue_date']),
                    'due_date' => escapeOutput($row['due_date']),
                    'overdue_days' => $overdue_days,
                    'fine' => $fine
                ];
            }
        }
        echo json_encode(["status" => "success", "data" => $borrowings, "total_fine" => $total_fine, "max_overdue_days" => $max_overdue_days]);
        $stmt->close();
        break;

    case 'reserve_book':
        requirePostMethod();
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id']; $bookId = getJsonValue($data, 'book_id', '');
        
        $stmtLimit = $conn->prepare("SELECT COUNT(*) as count FROM reservations WHERE student_id = ?");
        $stmtLimit->bind_param("s", $studentId); $stmtLimit->execute();
        $resCount = $stmtLimit->get_result()->fetch_assoc()['count'];
        if($resCount >= 2) {
            echo json_encode(["status" => "error", "message" => "You can only reserve a maximum of 2 books at a time."]);
            exit();
        }

        $stmt = $conn->prepare("SELECT status FROM books WHERE book_id = ?");
        $stmt->bind_param("s", $bookId); $stmt->execute(); $res = $stmt->get_result();
        if($res->num_rows === 0) { echo json_encode(["status" => "error", "message" => "Book not found."]); exit(); }
        if($res->fetch_assoc()['status'] !== 'Available') { echo json_encode(["status" => "error", "message" => "Book is currently not available."]); exit(); }
        
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("UPDATE books SET status='Reserved' WHERE book_id=?");
            $stmt->bind_param("s", $bookId); $stmt->execute();
            $stmt = $conn->prepare("INSERT INTO reservations (student_id, book_id, request_date, status) VALUES (?, ?, NOW(), 'Pending')");
            $stmt->bind_param("ss", $studentId, $bookId); $stmt->execute();
            $reservationId = $conn->insert_id;
            
            $conn->query("CREATE TABLE IF NOT EXISTS notifications (id INT AUTO_INCREMENT PRIMARY KEY, type VARCHAR(50) DEFAULT NULL, reference_id VARCHAR(100) DEFAULT NULL, message TEXT DEFAULT NULL, is_read TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            $notifStmt = $conn->prepare("INSERT INTO notifications (type, reference_id, message, is_read) VALUES (?, ?, ?, 0)");
            $msg = "New reservation request by {$studentId} for book {$bookId}";
            $t = 'reservation';
            $notifStmt->bind_param("sss", $t, $reservationId, $msg);
            $notifStmt->execute();
            $notifStmt->close();
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Book reserved! You have 24 hours to collect it."]);
        } catch (Exception $e) { 
            $conn->rollback(); 
            error_log("DB Error in reserve_book: " . $e->getMessage());
            echo json_encode(["status" => "error", "message" => "System Error: Failed to reserve book."]); 
        }
        break;

    case 'approve_reservation':
        requirePostMethod();
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $resId = $data['reservation_id'];
        
        $sysSettings = getSystemSettings($conn);
        $borrow_days = $sysSettings['borrowing_period']; // Dynamic Borrowing Days

        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("SELECT student_id, book_id FROM reservations WHERE id=?");
            $stmt->bind_param("i", $resId); $stmt->execute(); $res = $stmt->get_result();
            if($res->num_rows === 0) throw new Exception("Reservation not found.");
            $row = $res->fetch_assoc(); $studentId = $row['student_id']; $bookId = $row['book_id'];
            
            $stmt2 = $conn->prepare("INSERT INTO borrowings (student_id, book_id, issue_date, due_date) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY))");
            $stmt2->bind_param("ssi", $studentId, $bookId, $borrow_days); $stmt2->execute();
            
            $stmt3 = $conn->prepare("UPDATE books SET status='Borrowed' WHERE book_id=?");
            $stmt3->bind_param("s", $bookId); $stmt3->execute();
            
            $stmt4 = $conn->prepare("DELETE FROM reservations WHERE id=?");
            $stmt4->bind_param("i", $resId); $stmt4->execute();
            $conn->commit();
            
            $conn->query("CREATE TABLE IF NOT EXISTS notifications (id INT AUTO_INCREMENT PRIMARY KEY, type VARCHAR(50) DEFAULT NULL, reference_id VARCHAR(100) DEFAULT NULL, message TEXT DEFAULT NULL, is_read TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            $notifStmt = $conn->prepare("INSERT INTO notifications (type, reference_id, message, is_read) VALUES (?, ?, ?, 0)");
            $msg = "Reservation {$resId} approved and book {$bookId} issued to {$studentId}";
            $t = 'reservation_approved';
            $notifStmt->bind_param("sss", $t, $resId, $msg);
            $notifStmt->execute();
            $notifStmt->close();
            echo json_encode(["status" => "success", "message" => "Request Approved! Book issued for {$borrow_days} days."]);
        } catch (Exception $e) { 
            $conn->rollback(); 
            error_log("DB Error in approve_reservation: " . $e->getMessage());
            echo json_encode(["status" => "error", "message" => "System Error: Failed to approve reservation."]); 
        }
        break;

    case 'cancel_reservation':
        requirePostMethod();
        if (!isset($_SESSION['student_id']) && !isset($_SESSION['admin_id'])) { 
            echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); 
        }
        $resId = $data['reservation_id'];
        
        $stmt = $conn->prepare("SELECT student_id, book_id FROM reservations WHERE id = ?");
        $stmt->bind_param("i", $resId); $stmt->execute(); $result = $stmt->get_result();
        if($result->num_rows === 0) { echo json_encode(["status" => "error", "message" => "Reservation not found."]); exit(); }
        $reservation = $result->fetch_assoc();
        
        if (!isset($_SESSION['admin_id']) && ($reservation['student_id'] ?? '') !== $_SESSION['student_id']) {
            echo json_encode(["status" => "error", "message" => "Unauthorized"]);
            exit();
        }
        
        $bookId = $reservation['book_id'];
        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("UPDATE books SET status='Available' WHERE book_id=?");
            $stmt->bind_param("s", $bookId); $stmt->execute();
            $stmt = $conn->prepare("DELETE FROM reservations WHERE id=?");
            $stmt->bind_param("i", $resId); $stmt->execute();
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Reservation cancelled successfully!"]);
        } catch (Exception $e) { 
            $conn->rollback(); 
            error_log("DB Error in cancel_reservation: " . $e->getMessage());
            echo json_encode(["status" => "error", "message" => "System Error: Failed to cancel reservation."]); 
        }
        break;

    case 'submit_scan_request':
        requirePostMethod();
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id']; 
        $bookId = getJsonValue($data, 'book_id', '');
        
        $sysSettings = getSystemSettings($conn);
        $borrow_days = $sysSettings['borrowing_period']; // Dynamic Borrowing Days

        $conn->begin_transaction();
        try {
            $stmt = $conn->prepare("SELECT status FROM books WHERE book_id=?");
            $stmt->bind_param("s", $bookId); 
            $stmt->execute(); 
            $res = $stmt->get_result();
            
            if($res->num_rows === 0) throw new Exception("Book not found.");
            if($res->fetch_assoc()['status'] !== 'Available') throw new Exception("Sorry, this book is not available right now.");
            
            $stmt2 = $conn->prepare("INSERT INTO borrowings (student_id, book_id, issue_date, due_date) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY))");
            $stmt2->bind_param("ssi", $studentId, $bookId, $borrow_days); 
            $stmt2->execute();
            
            $stmt3 = $conn->prepare("UPDATE books SET status='Borrowed' WHERE book_id=?");
            $stmt3->bind_param("s", $bookId); 
            $stmt3->execute();
            
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Success! The book has been issued to you for {$borrow_days} days."]);
        } catch (Exception $e) { 
            $conn->rollback();
            if ($e->getMessage() === "Book not found." || $e->getMessage() === "Sorry, this book is not available right now.") {
                 echo json_encode(["status" => "error", "message" => $e->getMessage()]);
            } else {
                 error_log("DB Error in submit_scan_request: " . $e->getMessage());
                 echo json_encode(["status" => "error", "message" => "System Error: Failed to process scan request."]); 
            }
        }
        break;

    case 'get_books':
        $result = $conn->query("SELECT * FROM books");
        $books = [];
        if ($result && $result->num_rows > 0) { 
            while($row = $result->fetch_assoc()) { 
                $books[] = [
                    'book_id' => escapeOutput($row['book_id']),
                    'title' => escapeOutput($row['title']),
                    'author' => escapeOutput($row['author']),
                    'category' => escapeOutput($row['category']),
                    'status' => escapeOutput($row['status']),
                    'cover_img' => escapeOutput($row['cover_img']),
                    'date_added' => escapeOutput($row['date_added'])
                ]; 
            } 
        }
        echo json_encode(["status" => "success", "data" => $books]);
        break;

    case 'get_admin_reservations':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $sql = "SELECT r.id, s.full_name, s.student_id, b.title, r.request_date, r.status FROM reservations r JOIN books b ON r.book_id = b.book_id JOIN students s ON r.student_id = s.student_id";
        $result = $conn->query($sql);
        $reservations = [];
        if ($result && $result->num_rows > 0) { 
            while($row = $result->fetch_assoc()) { 
                $reservations[] = [
                    'id' => (int)$row['id'],
                    'full_name' => escapeOutput($row['full_name']),
                    'student_id' => escapeOutput($row['student_id']),
                    'title' => escapeOutput($row['title']),
                    'request_date' => escapeOutput($row['request_date']),
                    'status' => escapeOutput($row['status'])
                ]; 
            } 
        }
        echo json_encode(["status" => "success", "data" => $reservations]);
        break;

    case 'get_student_reservations':
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id'];
        $sql = "SELECT r.id, b.title, r.request_date, r.status FROM reservations r JOIN books b ON r.book_id = b.book_id WHERE r.student_id = ?";
        $stmt = $conn->prepare($sql); $stmt->bind_param("s", $studentId); $stmt->execute();
        $result = $stmt->get_result();
        $reservations = [];
        if ($result->num_rows > 0) { 
            while($row = $result->fetch_assoc()) { 
                $reservations[] = [
                    'id' => (int)$row['id'],
                    'title' => escapeOutput($row['title']),
                    'request_date' => escapeOutput($row['request_date']),
                    'status' => escapeOutput($row['status'])
                ]; 
            } 
        }
        echo json_encode(["status" => "success", "data" => $reservations]);
        $stmt->close();
        break;

    case 'get_return_details':
        requirePostMethod();
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $bookId = $data['book_id'];
        
        $sysSettings = getSystemSettings($conn);
        $fine_rate = $sysSettings['fine_rate'];

        $sql = "SELECT bw.id as borrowing_id, bw.book_id, b.title, s.student_id, s.full_name, bw.due_date, DATEDIFF(CURDATE(), bw.due_date) as overdue_days 
                FROM borrowings bw 
                JOIN books b ON bw.book_id = b.book_id 
                JOIN students s ON bw.student_id = s.student_id 
                WHERE bw.book_id = ? AND bw.return_date IS NULL";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $bookId); 
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $days = (int)$row['overdue_days'];
            $overdue_days = $days > 0 ? $days : 0;
            
            echo json_encode(["status" => "success", "data" => [
                'borrowing_id' => (int)$row['borrowing_id'],
                'book_id' => escapeOutput($row['book_id']),
                'title' => escapeOutput($row['title']),
                'student_id' => escapeOutput($row['student_id']),
                'full_name' => escapeOutput($row['full_name']),
                'due_date' => escapeOutput($row['due_date']),
                'overdue_days' => $overdue_days,
                'fine' => $overdue_days * $fine_rate
            ]]);
        } else {
            echo json_encode(["status" => "error", "message" => "මෙම පොත දැනට කිසිවෙකුට නිකුත් කර නොමැත (No active borrowing found)."]);
        }
        $stmt->close();
        break;

    case 'process_return':
        requirePostMethod();
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $borrowingId = $data['borrowing_id'];
        $bookId = $data['book_id'];
        
        $conn->begin_transaction();
        try {
            $stmt1 = $conn->prepare("UPDATE borrowings SET return_date = CURDATE() WHERE id = ?");
            $stmt1->bind_param("i", $borrowingId); 
            $stmt1->execute();
            
            $stmt2 = $conn->prepare("UPDATE books SET status = 'Available' WHERE book_id = ?");
            $stmt2->bind_param("s", $bookId); 
            $stmt2->execute();
            
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "පොත සාර්ථකව Return කරන ලදී!"]);
        } catch (Exception $e) {
            $conn->rollback();
            error_log("DB Error in process_return: " . $e->getMessage());
            echo json_encode(["status" => "error", "message" => "System Error: පොත Return කිරීම අසාර්ථකයි."]);
        }
        break;
}
$conn->close();
?>