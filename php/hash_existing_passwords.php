<?php
require 'db_connect.php';

if (!isset($conn)) {
    exit('Database connection is not available.');
}

$tables = [
    'students' => 'student_id',
    'admins' => 'work_id'
];

foreach ($tables as $table => $idColumn) {
    $result = $conn->query("SELECT $idColumn, password FROM $table WHERE password IS NOT NULL");
    if (!$result) {
        echo "Failed to read $table<br>";
        continue;
    }

    while ($row = $result->fetch_assoc()) {
        $id = $row[$idColumn];
        $password = $row['password'];

        if ($password === '') {
            continue;
        }

        $isHashed = password_get_info($password)['algo'] !== null;
        if ($isHashed) {
            continue;
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE $table SET password = ? WHERE $idColumn = ?");
        $stmt->bind_param('ss', $hash, $id);
        $stmt->execute();
        $stmt->close();
    }
}

echo "Password hashing migration completed.";
$conn->close();
