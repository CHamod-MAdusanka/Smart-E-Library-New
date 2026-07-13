<?php
session_start();
if (!isset($_SESSION['admin_id'])) { die("Unauthorized access"); }
require 'db_connect.php';

$tables = array();
$result = $conn->query("SHOW TABLES");
while($row = $result->fetch_row()) { $tables[] = $row[0]; }

$sqlScript = "";
foreach($tables as $table) {
    $result = $conn->query("SHOW CREATE TABLE $table");
    $row = $result->fetch_row();
    $sqlScript .= "\n\n" . $row[1] . ";\n\n";

    $result = $conn->query("SELECT * FROM $table");
    $columnCount = $result->field_count;

    for($i = 0; $i < $columnCount; $i++) {
        while($row = $result->fetch_row()) {
            $sqlScript .= "INSERT INTO $table VALUES(";
            for($j = 0; $j < $columnCount; $j++) {
                if(isset($row[$j])) { $sqlScript .= '"' . $conn->real_escape_string($row[$j]) . '"'; } else { $sqlScript .= '""'; }
                if($j < ($columnCount - 1)) { $sqlScript .= ','; }
            }
            $sqlScript .= ");\n";
        }
    }
    $sqlScript .= "\n";
}

if(!empty($sqlScript)) {
    $backup_file_name = $dbname . '_backup_' . time() . '.sql';
    header('Content-Type: application/x-sql');
    header('Content-Disposition: attachment; filename=' . $backup_file_name);
    echo $sqlScript;
    exit;
}
?>