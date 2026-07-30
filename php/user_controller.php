<?php
session_start();
header('Content-Type: application/json');
require 'db_connect.php';

function hasValidUpload(array $file, array $allowedMimeTypes, array $allowedExtensions): bool {
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
        return false;
    }
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $detectedMime = mime_content_type($file['tmp_name']);
    if ($detectedMime === false) {
        $detectedMime = $file['type'] ?? '';
    }
    return in_array($detectedMime, $allowedMimeTypes, true) && in_array($extension, $allowedExtensions, true);
}

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
    // === 1. UPDATE STUDENT PROFILE ===
    // ==========================================
    case 'update_student_profile':
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $_SESSION['student_id'];
        $password = isset($_POST['password']) ? (string)$_POST['password'] : '';
        $name = isset($_POST['name']) ? (string)$_POST['name'] : '';
        $email = isset($_POST['email']) ? (string)$_POST['email'] : '';
        $phone = isset($_POST['phone']) ? (string)$_POST['phone'] : '';
        $dob = isset($_POST['dob']) ? (string)$_POST['dob'] : '';

        $stmt = $conn->prepare("SELECT password FROM students WHERE student_id = ?");
        $stmt->bind_param("s", $studentId); $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if (!password_verify($password, $user['password'] ?? '')) { 
            echo json_encode(["status" => "error", "message" => "Incorrect current password!"]); 
            exit(); 
        }

        $picPath = null;
        if (isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === 0) {
            $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (!hasValidUpload($_FILES['profile_pic'], $allowedMimeTypes, $allowedExtensions)) {
                echo json_encode(["status" => "error", "message" => "Only JPG, PNG, GIF, or WEBP profile pictures are allowed."]);
                exit();
            }

            $targetDir = "../uploads/profiles/";
            if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);
            $fileName = time() . "_" . basename($_FILES["profile_pic"]["name"]);
            $targetFilePath = $targetDir . $fileName;
            if (move_uploaded_file($_FILES["profile_pic"]["tmp_name"], $targetFilePath)) {
                $existingPic = $user['profile_pic'] ?? '';
                if (!empty($existingPic) && $existingPic !== 'static/admin.png' && $existingPic !== 'static/chamod.png') {
                    $oldFile = '../' . ltrim($existingPic, '/');
                    if (file_exists($oldFile)) {
                        @unlink($oldFile);
                    }
                }
                $picPath = "uploads/profiles/" . $fileName; 
            }
        }

        if ($picPath) {
            $update = $conn->prepare("UPDATE students SET full_name=?, email=?, phone=?, dob=?, profile_pic=? WHERE student_id=?");
            $update->bind_param("ssssss", $name, $email, $phone, $dob, $picPath, $studentId);
        } else {
            $update = $conn->prepare("UPDATE students SET full_name=?, email=?, phone=?, dob=? WHERE student_id=?");
            $update->bind_param("sssss", $name, $email, $phone, $dob, $studentId);
        }

        if ($update->execute()) echo json_encode(["status" => "success", "message" => "Profile updated successfully!"]);
        else echo json_encode(["status" => "error", "message" => "Failed to update profile."]);
        $stmt->close(); if(isset($update)) $update->close();
        break;

    // ==========================================
    // === 2. UPDATE ADMIN PROFILE ===
    // ==========================================
    case 'update_admin_profile':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $adminId = $_SESSION['admin_id'];
        
        // [FIXED] Receive values via POST since FormData is used instead of JSON
        $pass = $_POST['password'] ?? getJsonValue($data, 'password', '');
        $fullName = $_POST['full_name'] ?? getJsonValue($data, 'full_name', '');
        $email = $_POST['email'] ?? getJsonValue($data, 'email', '');

        $stmt = $conn->prepare("SELECT password FROM admins WHERE work_id = ?");
        $stmt->bind_param("s", $adminId); $stmt->execute();
        $user = $stmt->get_result()->fetch_assoc();

        if (!password_verify($pass, $user['password'] ?? '')) { 
            echo json_encode(["status" => "error", "message" => "Incorrect current password!"]); 
            exit(); 
        }

        $nameParts = explode(" ", $fullName, 2);
        $fName = $nameParts[0]; $lName = isset($nameParts[1]) ? $nameParts[1] : '';

        // [FIXED] Process physical file upload instead of Base64 text
        $picPath = null;
        if (isset($_FILES['profile_pic']) && $_FILES['profile_pic']['error'] === 0) {
            $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (!hasValidUpload($_FILES['profile_pic'], $allowedMimeTypes, $allowedExtensions)) {
                echo json_encode(["status" => "error", "message" => "Only JPG, PNG, GIF, or WEBP profile pictures are allowed."]);
                exit();
            }

            $targetDir = "../uploads/profiles/";
            if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);
            $fileName = time() . "_admin_" . basename($_FILES["profile_pic"]["name"]);
            $targetFilePath = $targetDir . $fileName;
            if (move_uploaded_file($_FILES["profile_pic"]["tmp_name"], $targetFilePath)) {
                $picPath = "uploads/profiles/" . $fileName; 
            }
        }

        // [FIXED] Update database with file path, not Base64 text
        if ($picPath) {
            $update = $conn->prepare("UPDATE admins SET first_name=?, last_name=?, email=?, profile_pic=? WHERE work_id=?");
            $update->bind_param("sssss", $fName, $lName, $email, $picPath, $adminId);
        } else {
            $update = $conn->prepare("UPDATE admins SET first_name=?, last_name=?, email=? WHERE work_id=?");
            $update->bind_param("ssss", $fName, $lName, $email, $adminId);
        }

        if($update->execute()) echo json_encode(["status" => "success", "message" => "Profile updated successfully!"]);
        else echo json_encode(["status" => "error", "message" => "Failed to update profile."]);
        $stmt->close(); if(isset($update)) $update->close();
        break;

    // ==========================================
    // === 3. ADD OFFICER ===
    // ==========================================
    case 'add_officer':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized access!"]); exit(); }
        $workId = getJsonValue($data, 'work_id', ''); $firstName = getJsonValue($data, 'first_name', ''); $lastName = getJsonValue($data, 'last_name', '');
        $email = getJsonValue($data, 'email', ''); $password = getJsonValue($data, 'password', ''); $role = "Officer"; $profilePic = "static/admin.png";

        $checkStmt = $conn->prepare("SELECT work_id FROM admins WHERE work_id = ?");
        $checkStmt->bind_param("s", $workId); $checkStmt->execute();
        if($checkStmt->get_result()->num_rows > 0) { echo json_encode(["status" => "error", "message" => "This Work ID already exists!"]); exit(); }
        $checkStmt->close();
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $sql = "INSERT INTO admins (work_id, first_name, last_name, email, role, profile_pic, password) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssssss", $workId, $firstName, $lastName, $email, $role, $profilePic, $hashedPassword);
        
        if ($stmt->execute()) echo json_encode(["status" => "success", "message" => "New Officer account created successfully!"]);
        else echo json_encode(["status" => "error", "message" => "Failed to create account."]);
        $stmt->close();
        break;

    // ==========================================
    // === 4. APPROVE STUDENT ===
    // ==========================================
    case 'approve_student':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $data['student_id'];
        $stmt = $conn->prepare("UPDATE students SET status = 'Approved' WHERE student_id = ?");
        $stmt->bind_param("s", $studentId);
        if ($stmt->execute()) echo json_encode(["status" => "success", "message" => "Student approved successfully"]);
        else echo json_encode(["status" => "error", "message" => "Failed to approve student"]);
        $stmt->close();
        break;

    // ==========================================
    // === 5. REMOVE STUDENT ===
    // ==========================================
    case 'remove_student':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $studentId = $data['student_id'];
        $stmt = $conn->prepare("DELETE FROM students WHERE student_id = ?");
        $stmt->bind_param("s", $studentId);
        if ($stmt->execute()) echo json_encode(["status" => "success", "message" => "Student removed successfully"]);
        else echo json_encode(["status" => "error", "message" => "Failed to remove student"]);
        $stmt->close();
        break;

    // ==========================================
    // === 6. DELETE ACCOUNT (ADMIN) ===
    // ==========================================
    case 'delete_account':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $currentAdmin = $_SESSION['admin_id'];
        $stmt = $conn->prepare("DELETE FROM admins WHERE work_id=?");
        $stmt->bind_param("s", $currentAdmin);
        if($stmt->execute()) {
            session_destroy(); 
            echo json_encode(["status" => "success", "message" => "Your account has been deleted permanently."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Failed to delete account."]);
        }
        $stmt->close();
        break;

    // ==========================================
    // === 7. GET ALL STUDENTS ===
    // ==========================================
    case 'get_all_students':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $result = $conn->query("SELECT student_id, full_name, email, status, profile_pic FROM students WHERE status = 'Approved'");
        $students = [];
        if ($result && $result->num_rows > 0) { while($row = $result->fetch_assoc()) { $students[] = $row; } }
        echo json_encode(["status" => "success", "data" => $students]);
        break;

    // ==========================================
    // === 8. GET PENDING STUDENTS ===
    // ==========================================
    case 'get_pending_students':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $result = $conn->query("SELECT student_id, full_name, email, proof_doc FROM students WHERE status = 'Pending'");
        $students = [];
        if ($result && $result->num_rows > 0) { while($row = $result->fetch_assoc()) { $students[] = $row; } }
        echo json_encode(["status" => "success", "data" => $students]);
        break;

    // ==========================================
    // === 9. GET OFFICERS ===
    // ==========================================
    case 'get_officers':
        $result = $conn->query("SELECT work_id, CONCAT(first_name, ' ', last_name) AS full_name, email FROM admins WHERE role != 'Head Admin'");
        if (!isset($_SESSION['admin_id'])) { echo json_encode(['status' => 'error', 'message' => 'Unauthorized']); exit(); }
        $officers = [];
        if ($result && $result->num_rows > 0) { while($row = $result->fetch_assoc()) { $officers[] = [
            'work_id' => escapeOutput($row['work_id']),
            'full_name' => escapeOutput($row['full_name']),
            'email' => escapeOutput($row['email'])
        ]; } }
        echo json_encode(['status' => 'success', 'data' => $officers]);
        break;

    // ==========================================
    // === 10. GET STUDENT PROFILE ===
    // ==========================================
    case 'get_student_profile':
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Not logged in"]); exit(); }
        $studentId = $_SESSION['student_id'];
        $stmt = $conn->prepare("SELECT student_id, full_name, email, phone, dob, profile_pic FROM students WHERE student_id = ?");
        $stmt->bind_param("s", $studentId); $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            echo json_encode(["status" => "success", "data" => [
                "id" => escapeOutput($user['student_id']), "name" => escapeOutput($user['full_name']), "email" => escapeOutput($user['email']),
                "phone" => escapeOutput($user['phone']), "dob" => escapeOutput($user['dob']), "avatar" => escapeOutput($user['profile_pic'] ? $user['profile_pic'] : 'static/chamod.png')
            ]]);
        } else { echo json_encode(["status" => "error", "message" => "Student not found"]); }
        $stmt->close();
        break;

    // ==========================================
    // === 11. GET ADMIN PROFILE ===
    // ==========================================
    case 'get_admin_profile':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Not logged in"]); exit(); }
        $adminId = $_SESSION['admin_id'];
        $stmt = $conn->prepare("SELECT work_id, first_name, last_name, email, role, profile_pic FROM admins WHERE work_id = ?");
        $stmt->bind_param("s", $adminId); $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            echo json_encode(["status" => "success", "data" => [
                "id" => escapeOutput($user['work_id']), "name" => escapeOutput($user['first_name'] . " " . $user['last_name']),
                "email" => escapeOutput($user['email']), "role" => escapeOutput($user['role']), "avatar" => escapeOutput($user['profile_pic'])
            ]]);
        } else { echo json_encode(["status" => "error", "message" => "User not found"]); }
        $stmt->close();
        break;

    // ==========================================
    // === 12. TRANSFER OWNERSHIP ===
    // ==========================================
    case 'transfer_ownership':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        $currentAdmin = $_SESSION['admin_id'];
        $newHead = $data['new_head_id'];
        $conn->begin_transaction();
        try {
            $stmt1 = $conn->prepare("UPDATE admins SET role='Head Admin' WHERE work_id=?");
            $stmt1->bind_param("s", $newHead); $stmt1->execute();
            $stmt2 = $conn->prepare("UPDATE admins SET role='Officer' WHERE work_id=?");
            $stmt2->bind_param("s", $currentAdmin); $stmt2->execute();
            $conn->commit();
            echo json_encode(["status" => "success", "message" => "Ownership transferred successfully! You have been logged out as Head Admin."]);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(["status" => "error", "message" => "Transfer failed."]);
        }
        break;

    // ==========================================
    // === 13. UPDATE OFFICER PASSWORD ===
    // ==========================================
    case 'update_officer_password':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized"]); exit(); }
        
        $officerId = getJsonValue($data, 'work_id', '');
        $newPassword = getJsonValue($data, 'new_password', '');
        if (empty($newPassword)) { $newPassword = getJsonValue($data, 'password', ''); }

        if (empty($officerId) || empty($newPassword)) {
            echo json_encode(["status" => "error", "message" => "Missing Officer ID or New Password!"]);
            exit();
        }

        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE admins SET password = ? WHERE work_id = ?");
        $stmt->bind_param("ss", $hashedPassword, $officerId);
        
        if ($stmt->execute()) echo json_encode(["status" => "success", "message" => "Officer password updated successfully!"]);
        else echo json_encode(["status" => "error", "message" => "Failed to update password."]);
        $stmt->close();
        break;

    // ==========================================
    // === 14. REMOVE OFFICER ===
    // ==========================================
    case 'remove_officer':
        if (!isset($_SESSION['admin_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized access!"]); exit(); }
        
        $officerId = getJsonValue($data, 'work_id', '');
        if (empty($officerId)) { echo json_encode(["status" => "error", "message" => "Officer ID is missing."]); exit(); }

        $stmt = $conn->prepare("DELETE FROM admins WHERE work_id = ? AND role != 'Head Admin'");
        $stmt->bind_param("s", $officerId);
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) echo json_encode(["status" => "success", "message" => "Officer account removed successfully!"]);
            else echo json_encode(["status" => "error", "message" => "Officer not found or cannot remove Head Admin."]);
        } else {
            echo json_encode(["status" => "error", "message" => "Failed to remove officer account."]);
        }
        $stmt->close();
        break;

    // ==========================================
    // === 15. CHANGE STUDENT PASSWORD ===
    // ==========================================
    case 'change_student_password':
        if (!isset($_SESSION['student_id'])) { echo json_encode(["status" => "error", "message" => "Unauthorized access!"]); exit(); }
        
        $studentId = $_SESSION['student_id'];
        $currentPassword = getJsonValue($data, 'current_password', '');
        $newPassword = getJsonValue($data, 'new_password', '');

        if (empty($currentPassword) || empty($newPassword)) {
            echo json_encode(["status" => "error", "message" => "Please fill in all fields."]);
            exit();
        }

        $stmt = $conn->prepare("SELECT password FROM students WHERE student_id = ?");
        $stmt->bind_param("s", $studentId); $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            if (password_verify($currentPassword, $user['password'])) {
                $hashedNewPassword = password_hash($newPassword, PASSWORD_DEFAULT);
                $updateStmt = $conn->prepare("UPDATE students SET password = ? WHERE student_id = ?");
                $updateStmt->bind_param("ss", $hashedNewPassword, $studentId);
                
                if ($updateStmt->execute()) echo json_encode(["status" => "success", "message" => "Password updated successfully!"]);
                else echo json_encode(["status" => "error", "message" => "Failed to update password."]);
                $updateStmt->close();
            } else {
                echo json_encode(["status" => "error", "message" => "Incorrect current password!"]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "Student not found."]);
        }
        $stmt->close();
        break;

    default:
        echo json_encode(["status" => "error", "message" => "Invalid user action specified."]);
        break;
}
$conn->close();
?>