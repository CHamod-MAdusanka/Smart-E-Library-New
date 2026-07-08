<?php
header('Content-Type: application/json');
require 'db_connect.php'; 

$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['book_id']) && isset($data['title'])) {
    $bookId = $data['book_id'];
    $title = $data['title'];
    $author = $data['author'];
    $category = $data['category'];
    $coverData = $data['cover_img']; 
    $status = "Available"; 
    $dateAdded = date("Y-m-d");

    $coverPath = "static/covers/default.png"; 

    if ($coverData != null && strpos($coverData, 'data:image') === 0) {
        $image_parts = explode(";base64,", $coverData);
        $image_type_aux = explode("image/", $image_parts[0]);
        $image_type = $image_type_aux[1];
        $image_base64 = base64_decode($image_parts[1]);
        
        $fileName = $bookId . '_' . time() . '.' . $image_type;
        $filePath = '../static/covers/' . $fileName; 
        
        if(file_put_contents($filePath, $image_base64)){
            $coverPath = 'static/covers/' . $fileName; 
        }
    }

    $sql = "INSERT INTO books (book_id, title, author, category, status, cover_img, date_added) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sssssss", $bookId, $title, $author, $category, $status, $coverPath, $dateAdded);

    if ($stmt->execute()) {
        echo json_encode(["status" => "success", "message" => "Success: New book added to the database!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Database Error: " . $stmt->error]);
    }
    
    $stmt->close();
} else {
    echo json_encode(["status" => "error", "message" => "Error: Incomplete data received!"]);
}

$conn->close();
?>