<?php
session_start();
require 'db_connect.php';

// Action එක හඳුනාගැනීම (GET/POST/JSON)
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);
if (empty($action) && isset($data['action'])) {
    $action = $data['action'];
}

switch ($action) {

    // ==========================================
    // === 1. STUDENT LOGIN ===
    // ==========================================
    case 'student_login':
        if ($_SERVER["REQUEST_METHOD"] == "POST") {
            $studentId = $_POST['studentId'];
            $studentPassword = $_POST['studentPassword'];

            $sql = "SELECT student_id, password FROM students WHERE student_id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("s", $studentId);
            $stmt->execute();
            $stmt->store_result();

            if ($stmt->num_rows === 1) {
                $stmt->bind_result($f_student_id, $f_password);
                $stmt->fetch();
                if ($studentPassword === $f_password) {
                    $_SESSION['student_id'] = $f_student_id;
                    header("Location: ../student-dashboard.html");
                    exit();
                } else {
                    echo "<script>alert('Incorrect Password!'); window.location.href='../student-login.html';</script>";
                }
            } else {
                echo "<script>alert('Student ID not found!'); window.location.href='../student-login.html';</script>";
            }
            $stmt->close();
        }
        break;

    // ==========================================
    // === 2. ADMIN LOGIN ===
    // ==========================================
    case 'admin_login':
        if ($_SERVER["REQUEST_METHOD"] == "POST") {
            $adminId = $_POST['adminId'];
            $adminPassword = $_POST['adminPassword'];

            $sql = "SELECT work_id, password, role FROM admins WHERE work_id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("s", $adminId);
            $stmt->execute();
            $stmt->store_result();

            if ($stmt->num_rows === 1) {
                $stmt->bind_result($f_work_id, $f_password, $f_role);
                $stmt->fetch();
                if ($adminPassword === $f_password) {
                    $_SESSION['admin_id'] = $f_work_id;
                    if ($f_role === 'Head Admin') {
                        header("Location: ../head-dashboard.html");
                    } else {
                        header("Location: ../admin-dashboard.html");
                    }
                    exit();
                } else {
                    echo "<script>alert('Incorrect Password!'); window.location.href='../admin-login.html';</script>";
                }
            } else {
                echo "<script>alert('Admin ID not found!'); window.location.href='../admin-login.html';</script>";
            }
            $stmt->close();
        }
        break;

    // ==========================================
    // === 3. REGISTER STUDENT ===
    // ==========================================
    case 'register_student':
        if ($_SERVER["REQUEST_METHOD"] == "POST") {
            $firstName = $_POST['firstName'];
            $lastName = $_POST['lastName'];
            $fullName = $firstName . " " . $lastName;
            $dob = $_POST['dob'];
            $gender = $_POST['gender'];
            $email = $_POST['email'];
            $phone = $_POST['phone'];
            $password = $_POST['password']; 
            $status = 'Pending'; 

            $targetDir = "../uploads/proofs/";
            if (!is_dir($targetDir)) mkdir($targetDir, 0777, true); 
            
            $fileName = time() . "_" . basename($_FILES["proofFile"]["name"]);
            $targetFilePath = $targetDir . $fileName;
            move_uploaded_file($_FILES["proofFile"]["tmp_name"], $targetFilePath);

            $countQuery = $conn->query("SELECT count(*) AS total FROM students");
            $row = $countQuery->fetch_assoc();
            $nextIdNum = $row['total'] + 1;
            $newStudentId = "STU-" . str_pad($nextIdNum, 3, "0", STR_PAD_LEFT);

            $sql = "INSERT INTO students (student_id, full_name, dob, gender, email, phone, proof_doc, password, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("sssssssss", $newStudentId, $fullName, $dob, $gender, $email, $phone, $targetFilePath, $password, $status);
            
            if ($stmt->execute()) {
                header("Location: ../pending-approval.html");
                exit();
            } else {
                echo "Error saving data: " . $conn->error;
            }
            // Create a notification for admin about this new registration
            $conn->query("CREATE TABLE IF NOT EXISTS notifications (id INT AUTO_INCREMENT PRIMARY KEY, type VARCHAR(50) DEFAULT NULL, reference_id VARCHAR(100) DEFAULT NULL, message TEXT DEFAULT NULL, is_read TINYINT(1) DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
            $notifStmt = $conn->prepare("INSERT INTO notifications (type, reference_id, message, is_read) VALUES (?, ?, ?, 0)");
            $nType = 'registration';
            $nRef = $newStudentId;
            $nMsg = "New student registration: {$fullName} ({$newStudentId})";
            $notifStmt->bind_param("sss", $nType, $nRef, $nMsg);
            $notifStmt->execute();
            $notifStmt->close();
            $stmt->close();
        }
        break;

    // ==========================================
    // === 4. CHANGE STUDENT PASSWORD ===
    // ==========================================
    case 'change_student_password':
        header('Content-Type: application/json');
        if (!isset($_SESSION['student_id'])) {
            echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit();
        }
        $studentId = $_SESSION['student_id'];
        $curr = $data['current_password'];
        $new = $data['new_password'];

        $stmt = $conn->prepare("SELECT password FROM students WHERE student_id = ?");
        $stmt->bind_param("s", $studentId);
        $stmt->execute();
        $stmt->store_result();
        $db_password = null;
        if ($stmt->num_rows === 1) {
            $stmt->bind_result($db_password);
            $stmt->fetch();
        }

        if($db_password !== $curr) {
            echo json_encode(["status" => "error", "message" => "Incorrect current password!"]);
            exit();
        }

        $update = $conn->prepare("UPDATE students SET password=? WHERE student_id=?");
        $update->bind_param("ss", $new, $studentId);
        if($update->execute()) {
            echo json_encode(["status" => "success", "message" => "Password changed securely!"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Failed to change password."]);
        }
        $stmt->close(); $update->close();
        break;

    // ==========================================
    // === 5. CHANGE ADMIN PASSWORD ===
    // ==========================================
    case 'change_admin_password':
        header('Content-Type: application/json');
        if (!isset($_SESSION['admin_id'])) { 
            echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); 
        }
        $adminId = $_SESSION['admin_id'];
        $curr = $data['current_password'];
        $new = $data['new_password'];

        $stmt = $conn->prepare("SELECT password FROM admins WHERE work_id = ?");
        $stmt->bind_param("s", $adminId);
        $stmt->execute();
        $stmt->store_result();
        $db_password = null;
        if ($stmt->num_rows === 1) {
            $stmt->bind_result($db_password);
            $stmt->fetch();
        }

        if($db_password !== $curr) {
            echo json_encode(["status" => "error", "message" => "Incorrect current password!"]);
            exit();
        }

        $update = $conn->prepare("UPDATE admins SET password=? WHERE work_id=?");
        $update->bind_param("ss", $new, $adminId);
        if($update->execute()) {
            echo json_encode(["status" => "success", "message" => "Password changed securely!"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Failed to change password."]);
        }
        $stmt->close(); $update->close();
        break;

    default:
        header('Content-Type: application/json');
        echo json_encode(["status" => "error", "message" => "Invalid auth action specified."]);
        break;
}
$conn->close();
?>