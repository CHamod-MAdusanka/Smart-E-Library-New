<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit();
}

require 'db_connect.php';
$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['reservation_id'])) {
    $resId = $data['reservation_id'];

    $conn->begin_transaction();
    try {
        // 1. Reservation එකේ විස්තර ලබා ගැනීම (ළමයාගේ ID එක සහ පොතේ ID එක)
        $stmt = $conn->prepare("SELECT student_id, book_id FROM reservations WHERE id=?");
        $stmt->bind_param("i", $resId);
        $stmt->execute();
        $res = $stmt->get_result();
        if($res->num_rows === 0) {
            throw new Exception("Reservation not found.");
        }
        $row = $res->fetch_assoc();
        $studentId = $row['student_id'];
        $bookId = $row['book_id'];

        // 2. අලුත් Borrowings Table එකට පොත ඇතුළත් කිරීම (දින 14ක කාලයක් සමඟින්)
        $stmt2 = $conn->prepare("INSERT INTO borrowings (student_id, book_id, issue_date, due_date) VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY))");
        $stmt2->bind_param("ss", $studentId, $bookId);
        $stmt2->execute();

        // 3. Books Table එකේ පොතේ තත්ත්වය 'Borrowed' ලෙස වෙනස් කිරීම
        $stmt3 = $conn->prepare("UPDATE books SET status='Borrowed' WHERE book_id=?");
        $stmt3->bind_param("s", $bookId);
        $stmt3->execute();

        // 4. තාවකාලික Reservations Table එකෙන් රෙකෝඩ් එක මකා දැමීම
        $stmt4 = $conn->prepare("DELETE FROM reservations WHERE id=?");
        $stmt4->bind_param("i", $resId);
        $stmt4->execute();

        // සියලුම වෙනස්කම් සම්පූර්ණ කිරීම
        $conn->commit();
        echo json_encode(["status" => "success", "message" => "Request Approved! Book successfully issued for 14 days."]);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["status" => "error", "message" => "Failed to approve and issue book: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Invalid request"]);
}
$conn->close();
?>