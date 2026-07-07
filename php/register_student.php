<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

require 'db_connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // 1. Retrieve form data
    $firstName = $_POST['firstName'];
    $lastName = $_POST['lastName'];
    $fullName = $firstName . " " . $lastName;
    $dob = $_POST['dob'];
    $gender = $_POST['gender'];
    $email = $_POST['email'];
    $phone = $_POST['phone'];
    $password = $_POST['password']; 
    $status = 'Pending'; 

    // 2. Handle file upload (Birth Certificate / Proof)
    $targetDir = "../uploads/proofs/";
    
    if (!is_dir($targetDir)) { 
        mkdir($targetDir, 0777, true); 
    }
    
    $fileName = time() . "_" . basename($_FILES["proofFile"]["name"]);
    $targetFilePath = $targetDir . $fileName;
    
    move_uploaded_file($_FILES["proofFile"]["tmp_name"], $targetFilePath);

    // 3. Generate new Student ID (e.g., STU-001)
    $countQuery = $conn->query("SELECT count(*) AS total FROM students");
    
    if (!$countQuery) {
        die("<h3 style='color:red;'>Database Error: Cannot find 'students' table. (" . $conn->error . ")</h3>");
    }
    
    $row = $countQuery->fetch_assoc();
    $nextIdNum = $row['total'] + 1;
    $newStudentId = "STU-" . str_pad($nextIdNum, 3, "0", STR_PAD_LEFT);

    // 4. Insert data into the database
    $sql = "INSERT INTO students (student_id, full_name, dob, gender, email, phone, proof_doc, password, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    
    // Error handler for column mismatches
    if ($stmt === false) {
        die("<div style='background-color:#fee2e2; border:2px solid #dc2626; color:#991b1b; padding:20px; font-family:sans-serif; border-radius:10px; margin:20px;'>
             <h2>System Error Detected:</h2>
             <p>Database column mismatch in the 'students' table.</p>
             <p><strong>MySQL Error:</strong> <br><br> <span style='background:#fecaca; padding:10px; display:inline-block; border-radius:5px;'>👉 " . $conn->error . "</span></p>
             <p>Please verify the database schema via phpMyAdmin.</p>
             </div>");
    }

    $stmt->bind_param("sssssssss", $newStudentId, $fullName, $dob, $gender, $email, $phone, $targetFilePath, $password, $status);
    
    if ($stmt->execute()) {
        // Redirect to pending approval page on success
        header("Location: ../pending-approval.html");
        exit();
    } else {
        echo "Error saving data: " . $conn->error;
    }
    
    $stmt->close();
}
$conn->close();
?>