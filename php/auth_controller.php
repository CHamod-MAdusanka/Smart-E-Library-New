<?php
session_start();
require 'db_connect.php';

function verify_password(string $inputPassword, string $storedPassword): bool {
    return password_verify($inputPassword, $storedPassword);
}

function hasValidUpload(array $file, array $allowedMimeTypes, array $allowedExtensions): bool {
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
        return false;
    }
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $detectedMime = mime_content_type($file['tmp_name']);
    if ($detectedMime === false) { $detectedMime = $file['type'] ?? ''; }
    return in_array($detectedMime, $allowedMimeTypes, true) && in_array($extension, $allowedExtensions, true);
}

function getAuditKey(string $identifier, string $type): string {
    return $type . ':' . $identifier;
}

function getPostValue(array $postData, string $key, string $default = ''): string {
    return isset($postData[$key]) ? (string)$postData[$key] : $default;
}

function escapeOutput($value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function checkRateLimit(mysqli $conn, string $identifier, string $type, int $maxAttempts = 5, int $windowSeconds = 900): bool {
    $key = getAuditKey($identifier, $type);
    $now = time(); $lockUntil = $now + $windowSeconds;
    $stmt = $conn->prepare("SELECT attempts, last_attempt_at FROM login_attempts WHERE key_name = ?");
    $stmt->bind_param("s", $key); $stmt->execute();
    $result = $stmt->get_result(); $row = $result->fetch_assoc(); $stmt->close();

    if ($row) {
        $attempts = (int)$row['attempts']; $lastAttemptAt = (int)$row['last_attempt_at'];
        if ($attempts >= $maxAttempts && ($now - $lastAttemptAt) < $windowSeconds) return false;
        if (($now - $lastAttemptAt) >= $windowSeconds) {
            $stmt = $conn->prepare("DELETE FROM login_attempts WHERE key_name = ?");
            $stmt->bind_param("s", $key); $stmt->execute(); $stmt->close();
        }
    }
    return true;
}

function recordFailedAttempt(mysqli $conn, string $identifier, string $type): void {
    $key = getAuditKey($identifier, $type); $now = time();
    $stmt = $conn->prepare("SELECT attempts FROM login_attempts WHERE key_name = ?");
    $stmt->bind_param("s", $key); $stmt->execute(); $result = $stmt->get_result(); $row = $result->fetch_assoc(); $stmt->close();

    if ($row) {
        $newAttempts = (int)$row['attempts'] + 1;
        $stmt = $conn->prepare("UPDATE login_attempts SET attempts = ?, last_attempt_at = ? WHERE key_name = ?");
        $stmt->bind_param("iis", $newAttempts, $now, $key); $stmt->execute(); $stmt->close();
    } else {
        $stmt = $conn->prepare("INSERT INTO login_attempts (key_name, attempts, last_attempt_at) VALUES (?, 1, ?)");
        $stmt->bind_param("si", $key, $now); $stmt->execute(); $stmt->close();
    }
}

function resetRateLimit(mysqli $conn, string $identifier, string $type): void {
    $key = getAuditKey($identifier, $type);
    $stmt = $conn->prepare("DELETE FROM login_attempts WHERE key_name = ?");
    $stmt->bind_param("s", $key); $stmt->execute(); $stmt->close();
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$data = json_decode(file_get_contents('php://input'), true);
if (empty($action) && isset($data['action'])) { $action = $data['action']; }

switch ($action) {

    // [FIXED] API to check if Student ID exists before moving to Password Step
    case 'check_student_id':
        header('Content-Type: application/json');
        $studentId = $data['studentId'] ?? $_POST['studentId'] ?? '';
        $stmt = $conn->prepare("SELECT student_id FROM students WHERE student_id = ?");
        $stmt->bind_param("s", $studentId); $stmt->execute();
        if ($stmt->get_result()->num_rows === 1) { echo json_encode(["status" => "success"]); } 
        else { echo json_encode(["status" => "error", "message" => "Student ID not found in the system!"]); }
        $stmt->close();
        break;

    // [FIXED] API to check if Admin ID exists before moving to Password Step
    case 'check_admin_id':
        header('Content-Type: application/json');
        $adminId = $data['adminId'] ?? $_POST['adminId'] ?? '';
        $stmt = $conn->prepare("SELECT work_id FROM admins WHERE work_id = ?");
        $stmt->bind_param("s", $adminId); $stmt->execute();
        if ($stmt->get_result()->num_rows === 1) { echo json_encode(["status" => "success"]); } 
        else { echo json_encode(["status" => "error", "message" => "Admin ID not found in the system!"]); }
        $stmt->close();
        break;

    case 'student_login':
        if ($_SERVER["REQUEST_METHOD"] == "POST") {
            $studentId = getPostValue($_POST, 'studentId');
            $studentPassword = getPostValue($_POST, 'studentPassword');
            $rateLimitOk = checkRateLimit($conn, $studentId, 'student_login');
            if (!$rateLimitOk) { echo "<script>alert('Too many failed attempts. Please try again later.'); window.location.href='../student-login.html';</script>"; exit(); }

            $sql = "SELECT student_id, password FROM students WHERE student_id = ?";
            $stmt = $conn->prepare($sql); $stmt->bind_param("s", $studentId); $stmt->execute(); $stmt->store_result();

            if ($stmt->num_rows === 1) {
                $stmt->bind_result($f_student_id, $f_password); $stmt->fetch();
                if (verify_password($studentPassword, $f_password)) {
                    resetRateLimit($conn, $studentId, 'student_login'); session_regenerate_id(true); $_SESSION['student_id'] = $f_student_id;
                    header("Location: ../student-dashboard.php"); exit();
                } else {
                    recordFailedAttempt($conn, $studentId, 'student_login');
                    echo "<script>alert('Incorrect Password!'); window.location.href='../student-login.html';</script>";
                }
            } else {
                echo "<script>alert('Student ID not found!'); window.location.href='../student-login.html';</script>";
            }
            $stmt->close();
        }
        break;

    case 'admin_login':
        if ($_SERVER["REQUEST_METHOD"] == "POST") {
            $adminId = getPostValue($_POST, 'adminId');
            $adminPassword = getPostValue($_POST, 'adminPassword');
            $rateLimitOk = checkRateLimit($conn, $adminId, 'admin_login');
            if (!$rateLimitOk) { echo "<script>alert('Too many failed attempts. Please try again later.'); window.location.href='../admin-login.html';</script>"; exit(); }

            $sql = "SELECT work_id, password, role FROM admins WHERE work_id = ?";
            $stmt = $conn->prepare($sql); $stmt->bind_param("s", $adminId); $stmt->execute(); $stmt->store_result();

            if ($stmt->num_rows === 1) {
                $stmt->bind_result($f_work_id, $f_password, $f_role); $stmt->fetch();
                if (verify_password($adminPassword, $f_password)) {
                    resetRateLimit($conn, $adminId, 'admin_login'); session_regenerate_id(true); $_SESSION['admin_id'] = $f_work_id;
                    if ($f_role === 'Head Admin') { header("Location: ../head-dashboard.php"); } 
                    else { header("Location: ../admin-dashboard.php"); }
                    exit();
                } else {
                    recordFailedAttempt($conn, $adminId, 'admin_login');
                    echo "<script>alert('Incorrect Password!'); window.location.href='../admin-login.html';</script>";
                }
            } else {
                echo "<script>alert('Admin ID not found!'); window.location.href='../admin-login.html';</script>";
            }
            $stmt->close();
        }
        break;

    case 'register_student':
        if ($_SERVER["REQUEST_METHOD"] == "POST") {
            $firstName = getPostValue($_POST, 'firstName'); $lastName = getPostValue($_POST, 'lastName');
            $fullName = $firstName . " " . $lastName;
            $dob = getPostValue($_POST, 'dob'); $gender = getPostValue($_POST, 'gender');
            $email = getPostValue($_POST, 'email'); $phone = getPostValue($_POST, 'phone');
            $password = getPostValue($_POST, 'password');
            if (strlen($password) < 6) { echo "<script>alert('Password must be at least 6 characters long.'); window.location.href='../student-register.html';</script>"; exit(); }
            
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $status = 'Pending';

            $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'];
            if (!isset($_FILES['proofFile']) || !hasValidUpload($_FILES['proofFile'], $allowedMimeTypes, $allowedExtensions)) {
                echo "<script>alert('Only JPG, PNG, GIF, WEBP, or PDF proof documents are allowed.'); window.location.href='../student-register.html';</script>"; exit();
            }

            $targetDir = "../uploads/proofs/";
            if (!is_dir($targetDir)) mkdir($targetDir, 0777, true); 
            $fileName = time() . "_" . basename($_FILES["proofFile"]["name"]);
            $targetFilePath = $targetDir . $fileName;
            move_uploaded_file($_FILES["proofFile"]["tmp_name"], $targetFilePath);

            $conn->begin_transaction();
            try {
                $idQuery = $conn->query("SELECT MAX(CAST(SUBSTRING(student_id, 5) AS UNSIGNED)) AS max_id FROM students WHERE student_id LIKE 'STU-%'");
                $row = $idQuery->fetch_assoc();
                $nextIdNum = (int)($row['max_id'] ?? 0) + 1;
                $newStudentId = "STU-" . str_pad($nextIdNum, 3, "0", STR_PAD_LEFT);

                $sql = "INSERT INTO students (student_id, full_name, dob, gender, email, phone, proof_doc, password, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("sssssssss", $newStudentId, $fullName, $dob, $gender, $email, $phone, $targetFilePath, $hashedPassword, $status);
                
                if (!$stmt->execute()) { throw new Exception($stmt->error); }

                $notifStmt = $conn->prepare("INSERT INTO notifications (type, reference_id, message, is_read) VALUES (?, ?, ?, 0)");
                $nType = 'registration'; $nRef = $newStudentId;
                $nMsg = "New student registration: " . escapeOutput($fullName) . " (" . escapeOutput($newStudentId) . ")";
                $notifStmt->bind_param("sss", $nType, $nRef, $nMsg);
                if (!$notifStmt->execute()) { throw new Exception($notifStmt->error); }
                $notifStmt->close(); $stmt->close(); $conn->commit();
                header("Location: ../pending-approval.html"); exit();
            } catch (Exception $e) {
                $conn->rollback(); echo "Error saving data: " . $e->getMessage();
            }
        }
        break;

    case 'change_student_password':
        header('Content-Type: application/json');
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id'];
        $curr = isset($data['current_password']) ? (string)$data['current_password'] : '';
        $new = isset($data['new_password']) ? (string)$data['new_password'] : '';
        if (strlen($new) < 6) { echo json_encode(["status" => "error", "message" => "Password must be at least 6 characters long."]); exit(); }

        $stmt = $conn->prepare("SELECT password FROM students WHERE student_id = ?");
        $stmt->bind_param("s", $studentId); $stmt->execute(); $stmt->store_result();
        $db_password = null;
        if ($stmt->num_rows === 1) { $stmt->bind_result($db_password); $stmt->fetch(); }

        if (!verify_password($curr, $db_password)) { echo json_encode(["status" => "error", "message" => "Incorrect current password!"]); exit(); }

        $hashedNewPassword = password_hash($new, PASSWORD_DEFAULT);
        $update = $conn->prepare("UPDATE students SET password=? WHERE student_id=?");
        $update->bind_param("ss", $hashedNewPassword, $studentId);
        
        if($update->execute()) { echo json_encode(["status" => "success", "message" => "Password changed securely!"]); } 
        else { echo json_encode(["status" => "error", "message" => "Failed to change password."]); }
        $stmt->close(); $update->close();
        break;

    case 'change_admin_password':
        header('Content-Type: application/json');
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $adminId = $_SESSION['admin_id'];
        $curr = isset($data['current_password']) ? (string)$data['current_password'] : '';
        $new = isset($data['new_password']) ? (string)$data['new_password'] : '';
        if (strlen($new) < 6) { echo json_encode(["status" => "error", "message" => "Password must be at least 6 characters long."]); exit(); }

        $stmt = $conn->prepare("SELECT password FROM admins WHERE work_id = ?");
        $stmt->bind_param("s", $adminId); $stmt->execute(); $stmt->store_result();
        $db_password = null;
        if ($stmt->num_rows === 1) { $stmt->bind_result($db_password); $stmt->fetch(); }

        if (!verify_password($curr, $db_password)) { echo json_encode(["status" => "error", "message" => "Incorrect current password!"]); exit(); }

        $hashedNewPassword = password_hash($new, PASSWORD_DEFAULT);
        $update = $conn->prepare("UPDATE admins SET password=? WHERE work_id=?");
        $update->bind_param("ss", $hashedNewPassword, $adminId);
        
        if($update->execute()) { echo json_encode(["status" => "success", "message" => "Password changed securely!"]); } 
        else { echo json_encode(["status" => "error", "message" => "Failed to change password."]); }
        $stmt->close(); $update->close();
        break;

    default:
        header('Content-Type: application/json');
        echo json_encode(["status" => "error", "message" => "Invalid auth action specified."]);
        break;
}
$conn->close();
?>